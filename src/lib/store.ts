import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type {
  ChatMessage,
  CityLocation,
  CommunityChallenge,
  CommunityObservation,
  UserSettings,
} from '@/types/breathewise';
import {
  DEFAULT_USER_SETTINGS,
  INITIAL_COMMUNITY_CHALLENGES,
  INITIAL_COMMUNITY_OBSERVATIONS,
} from '@/lib/demo-data';
import { isSafeSessionId } from '@/lib/request-context';
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_SEVERITIES,
  redactCoordinateLikeText,
  validateAlertOrder,
} from '@/lib/validation';

interface SessionState {
  settings: UserSettings;
  chatHistory: ChatMessage[];
  joinedChallengeIds: string[];
  upvotedObservationIds: string[];
  challengeActionCounts: Record<string, number>;
  savedImpactFrequencies: Record<string, number>;
}

interface LocalDatabase {
  sessions: Record<string, SessionState>;
  observations: CommunityObservation[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(
  DATA_DIR,
  path.basename(process.env.BREATHEWISE_STORE_PATH || '') || 'local-store.json'
);
const DEFAULT_SESSION = 'legacy';

let testDb: LocalDatabase | null = null;
let localDbCache: LocalDatabase | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function getDefaultSession(): SessionState {
  return {
    settings: structuredClone(DEFAULT_USER_SETTINGS),
    chatHistory: [],
    joinedChallengeIds: [],
    upvotedObservationIds: [],
    challengeActionCounts: Object.create(null) as Record<string, number>,
    savedImpactFrequencies: {
      public_transit: 3,
      carpooling: 2,
      skip_short_car_trips: 4,
      save_electricity: 5,
      efficient_household_heating_cooling: 4,
      waste_compost_no_burn: 2,
    },
  };
}

function emptySessions(): Record<string, SessionState> {
  return Object.create(null) as Record<string, SessionState>;
}

function getDefaultDb(): LocalDatabase {
  return {
    sessions: emptySessions(),
    observations: structuredClone(INITIAL_COMMUNITY_OBSERVATIONS),
  };
}

function readLocalDb(): LocalDatabase {
  if (process.env.NODE_ENV === 'test') {
    testDb ??= getDefaultDb();
    return testDb;
  }
  if (localDbCache) return structuredClone(localDbCache);

  try {
    if (!fs.existsSync(STORE_PATH)) return getDefaultDb();
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')) as Partial<LocalDatabase> & {
      settings?: UserSettings;
      chatHistory?: ChatMessage[];
      savedImpactFrequencies?: Record<string, number>;
    };
    const defaults = getDefaultDb();
    const sessions = emptySessions();
    for (const [key, value] of Object.entries(parsed.sessions ?? {})) {
      if (isSafeSessionId(key)) {
        sessions[key] = hydrateSession(value as Partial<SessionState>);
      }
    }
    if (!Object.keys(sessions).length && parsed.settings) {
      sessions[DEFAULT_SESSION] = hydrateSession({
        settings: parsed.settings,
        chatHistory: parsed.chatHistory,
        savedImpactFrequencies: parsed.savedImpactFrequencies,
      });
    }
    return {
      sessions,
      observations: parsed.observations ?? defaults.observations,
    };
  } catch {
    return getDefaultDb();
  }
}

async function writeLocalDb(db: LocalDatabase): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    testDb = structuredClone(db);
    return;
  }
  localDbCache = structuredClone(db);
  writeQueue = writeQueue.then(async () => {
    try {
      await fs.promises.mkdir(path.dirname(STORE_PATH), { recursive: true });
      await fs.promises.writeFile(STORE_PATH, JSON.stringify(db, null, 2), 'utf8');
    } catch {
      // Read-only serverless filesystems fall back to in-process state only.
    }
  });
  await writeQueue;
}

function getSession(db: LocalDatabase, sessionId: string): SessionState {
  const key = isSafeSessionId(sessionId) ? sessionId : DEFAULT_SESSION;
  if (!Object.prototype.hasOwnProperty.call(db.sessions, key)) {
    db.sessions[key] = getDefaultSession();
  }
  return db.sessions[key];
}

function hydrateSession(raw: Partial<SessionState> | undefined): SessionState {
  const defaults = getDefaultSession();
  if (!raw) return defaults;
  const challengeActionCounts = Object.create(null) as Record<string, number>;
  for (const [key, value] of Object.entries(raw.challengeActionCounts ?? {})) {
    if (isSafeSessionId(key) && typeof value === 'number') challengeActionCounts[key] = value;
  }
  return {
    settings: {
      ...defaults.settings,
      ...(raw.settings ?? {}),
      defaultCity: (raw.settings?.defaultCity ?? defaults.settings.defaultCity) as CityLocation,
      alerts: {
        ...defaults.settings.alerts,
        ...(raw.settings?.alerts ?? {}),
      },
    },
    chatHistory: Array.isArray(raw.chatHistory) ? raw.chatHistory : [],
    joinedChallengeIds: Array.isArray(raw.joinedChallengeIds) ? raw.joinedChallengeIds : [],
    upvotedObservationIds: Array.isArray(raw.upvotedObservationIds)
      ? raw.upvotedObservationIds
      : [],
    challengeActionCounts,
    savedImpactFrequencies: raw.savedImpactFrequencies ?? defaults.savedImpactFrequencies,
  };
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function aggregateChallenges(
  db: LocalDatabase,
  sessionId: string
): CommunityChallenge[] {
  const participants = new Map<string, number>();
  const actions = new Map<string, number>();
  for (const session of Object.values(db.sessions)) {
    for (const id of session.joinedChallengeIds) {
      participants.set(id, (participants.get(id) ?? 0) + 1);
    }
    for (const [id, count] of Object.entries(session.challengeActionCounts ?? {})) {
      if (typeof count === 'number' && Number.isFinite(count)) {
        actions.set(id, (actions.get(id) ?? 0) + count);
      }
    }
  }
  const session = getSession(db, sessionId);
  return structuredClone(INITIAL_COMMUNITY_CHALLENGES).map((challenge) => ({
    ...challenge,
    participantsCount: challenge.participantsCount + (participants.get(challenge.id) ?? 0),
    currentActions: challenge.currentActions + (actions.get(challenge.id) ?? 0),
    joined: session.joinedChallengeIds.includes(challenge.id),
  }));
}

function dedupeObservations(observations: CommunityObservation[]): CommunityObservation[] {
  const seenIds = new Set<string>();
  const seenContent = new Set<string>();
  return observations.filter((observation) => {
    const content = `${observation.neighborhood}|${observation.city}|${observation.description}`
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    if (seenIds.has(observation.id) || seenContent.has(content)) return false;
    seenIds.add(observation.id);
    seenContent.add(content);
    return true;
  });
}

export async function getSettings(sessionId = DEFAULT_SESSION): Promise<UserSettings> {
  return structuredClone(getSession(readLocalDb(), sessionId).settings);
}

export async function updateSettings(
  patch: Partial<UserSettings>,
  sessionId = DEFAULT_SESSION
): Promise<UserSettings> {
  const db = readLocalDb();
  const session = getSession(db, sessionId);
  const alerts = { ...session.settings.alerts, ...(patch.alerts ?? {}) };
  session.settings = {
    ...session.settings,
    ...patch,
    alerts: validateAlertOrder(alerts) ? alerts : session.settings.alerts,
  };
  await writeLocalDb(db);
  return structuredClone(session.settings);
}

export async function getCommunityData(sessionId = DEFAULT_SESSION): Promise<{
  observations: CommunityObservation[];
  challenges: CommunityChallenge[];
  storageBackend: 'supabase' | 'local_json';
  upvotedObservationIds: string[];
}> {
  const db = readLocalDb();
  const session = getSession(db, sessionId);
  let observations = db.observations;
  let storageBackend: 'supabase' | 'local_json' = 'local_json';

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('community_observations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (!error && data && data.length > 0) {
        const remote = data.map((r) => {
          const id = String(r.id);
          const locallyConfirmed = session.upvotedObservationIds.includes(id);
          const hasLocalCopy = db.observations.some((o) => o.id === id);
          const category = COMMUNITY_CATEGORIES.includes(
            r.category as CommunityObservation['category']
          )
            ? (r.category as CommunityObservation['category'])
            : 'clear_breeze';
          const severity = COMMUNITY_SEVERITIES.includes(
            r.severity as CommunityObservation['severity']
          )
            ? (r.severity as CommunityObservation['severity'])
            : 'low';
          const upvotes = Math.max(0, Math.min(1_000_000, Number(r.upvotes ?? 0) || 0));
          return {
            id,
            neighborhood: redactCoordinateLikeText(r.neighborhood, 80) || 'Local Neighborhood',
            city: redactCoordinateLikeText(r.city, 60) || 'Local Area',
            category,
            severity,
            description: redactCoordinateLikeText(r.description, 320),
            verificationType: 'user_submitted' as const,
            upvotes: upvotes + (locallyConfirmed && !hasLocalCopy ? 1 : 0),
            createdAt: String(r.created_at),
          };
        });
        observations = dedupeObservations([...remote, ...observations]);
        storageBackend = 'supabase';
      }
    } catch {
      // Fall back to local JSON when tables are unavailable.
    }
  }

  const challenges = aggregateChallenges(db, sessionId);

  return {
    observations: dedupeObservations(observations).slice(0, 50),
    challenges,
    storageBackend,
    upvotedObservationIds: session.upvotedObservationIds,
  };
}

export async function addCommunityObservation(input: {
  neighborhood: string;
  city: string;
  category: CommunityObservation['category'];
  severity: CommunityObservation['severity'];
  description: string;
}): Promise<CommunityObservation> {
  const newObs: CommunityObservation = {
    id: `obs-${randomUUID()}`,
    neighborhood: redactCoordinateLikeText(input.neighborhood, 80) || 'Local Neighborhood',
    city: redactCoordinateLikeText(input.city, 60) || 'Local Area',
    category: input.category,
    severity: input.severity,
    description: redactCoordinateLikeText(input.description, 320),
    verificationType: 'user_submitted',
    upvotes: 1,
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error: insertError } = await supabase.from('community_observations').insert({
        neighborhood: newObs.neighborhood,
        city: newObs.city,
        category: newObs.category,
        severity: newObs.severity,
        description: newObs.description,
        verification_type: 'user_submitted',
        upvotes: 1,
      });
      if (insertError) throw insertError;
    } catch {
      // Fall through to local store.
    }
  }

  const db = readLocalDb();
  db.observations = [newObs, ...db.observations].slice(0, 50);
  await writeLocalDb(db);
  return newObs;
}

async function observationExists(id: string, db: LocalDatabase): Promise<boolean> {
  if (db.observations.some((o) => o.id === id)) return true;
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { data, error } = await supabase
      .from('community_observations')
      .select('id')
      .eq('id', id)
      .limit(1);
    return !error && !!data?.length;
  } catch {
    return false;
  }
}

export async function upvoteObservation(
  id: string,
  sessionId = DEFAULT_SESSION
): Promise<{ observations: CommunityObservation[]; alreadyVoted: boolean }> {
  const db = readLocalDb();
  const observations = structuredClone(db.observations);
  if (!(await observationExists(id, db))) {
    return { observations, alreadyVoted: true };
  }
  const session = getSession(db, sessionId);
  const alreadyVoted = session.upvotedObservationIds.includes(id);
  if (!alreadyVoted) {
    session.upvotedObservationIds.push(id);
    db.observations = db.observations.map((o) =>
      o.id === id ? { ...o, upvotes: o.upvotes + 1 } : o
    );
    await writeLocalDb(db);
  }
  return { observations: structuredClone(db.observations), alreadyVoted };
}

export async function actOnChallenge(
  challengeId: string,
  action: 'join' | 'log_action',
  sessionId = DEFAULT_SESSION
): Promise<{ challenges: CommunityChallenge[]; alreadyJoined: boolean }> {
  const db = readLocalDb();
  if (!INITIAL_COMMUNITY_CHALLENGES.some((c) => c.id === challengeId)) {
    return { challenges: aggregateChallenges(db, sessionId), alreadyJoined: true };
  }
  const session = getSession(db, sessionId);
  const alreadyJoined = session.joinedChallengeIds.includes(challengeId);
  const count = session.challengeActionCounts[challengeId] ?? 0;

  if (action === 'join' && !alreadyJoined) {
    session.joinedChallengeIds.push(challengeId);
  } else if (action === 'log_action' && count < 10) {
    session.challengeActionCounts[challengeId] = count + 1;
    if (!alreadyJoined) session.joinedChallengeIds.push(challengeId);
  }

  await writeLocalDb(db);
  const challenges = aggregateChallenges(db, sessionId);
  return { challenges, alreadyJoined };
}

export async function getChatHistory(sessionId = DEFAULT_SESSION): Promise<ChatMessage[]> {
  return structuredClone(getSession(readLocalDb(), sessionId).chatHistory);
}

export async function appendChatMessages(
  messages: ChatMessage[],
  sessionId = DEFAULT_SESSION
): Promise<void> {
  const db = readLocalDb();
  const session = getSession(db, sessionId);
  session.chatHistory = [...session.chatHistory, ...messages].slice(-40);
  await writeLocalDb(db);
}

export async function clearChatHistory(sessionId = DEFAULT_SESSION): Promise<void> {
  const db = readLocalDb();
  getSession(db, sessionId).chatHistory = [];
  await writeLocalDb(db);
}

export async function getSavedImpactFrequencies(
  sessionId = DEFAULT_SESSION
): Promise<Record<string, number>> {
  return structuredClone(getSession(readLocalDb(), sessionId).savedImpactFrequencies);
}

export async function saveImpactFrequencies(
  frequencies: Record<string, number>,
  sessionId = DEFAULT_SESSION
): Promise<Record<string, number>> {
  const db = readLocalDb();
  const session = getSession(db, sessionId);
  session.savedImpactFrequencies = structuredClone(frequencies);
  await writeLocalDb(db);
  return structuredClone(frequencies);
}
