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
const STORE_PATH =
  process.env.BREATHEWISE_STORE_PATH || path.join(DATA_DIR, 'local-store.json');
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
    challengeActionCounts: {},
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

function getDefaultDb(): LocalDatabase {
  return {
    sessions: {},
    observations: structuredClone(INITIAL_COMMUNITY_OBSERVATIONS),
  };
}

function hydrateSession(raw: Partial<SessionState> | undefined): SessionState {
  const defaults = getDefaultSession();
  if (!raw) return defaults;
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
    chatHistory: raw.chatHistory ?? [],
    joinedChallengeIds: raw.joinedChallengeIds ?? [],
    upvotedObservationIds: raw.upvotedObservationIds ?? [],
    challengeActionCounts: raw.challengeActionCounts ?? {},
    savedImpactFrequencies: raw.savedImpactFrequencies ?? defaults.savedImpactFrequencies,
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
    const sessions = parsed.sessions ?? {};
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
  db.sessions[sessionId] ??= getDefaultSession();
  return db.sessions[sessionId];
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
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
  session.settings = {
    ...session.settings,
    ...patch,
    alerts: { ...session.settings.alerts, ...(patch.alerts ?? {}) },
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
        observations = [
          ...data.map((r) => ({
            id: String(r.id),
            neighborhood: String(r.neighborhood),
            city: String(r.city),
            category: r.category as CommunityObservation['category'],
            severity: r.severity as CommunityObservation['severity'],
            description: String(r.description),
            verificationType: 'user_submitted' as const,
            upvotes: Number(r.upvotes ?? 0),
            createdAt: String(r.created_at),
          })),
          ...observations,
        ];
        storageBackend = 'supabase';
      }
    } catch {
      // Fall back to local JSON when tables are unavailable.
    }
  }

  const challenges = structuredClone(INITIAL_COMMUNITY_CHALLENGES).map((c) => ({
    ...c,
    joined: session.joinedChallengeIds.includes(c.id),
  }));

  return {
    observations: observations.slice(0, 50),
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
  const redact = (value: string) =>
    value
      .replace(/\b-?\d{1,3}\.\d{3,}\b/g, '[redacted]')
      .replace(/\b\d{1,3}(?:[.,]\d{1,3}){2,}\b/g, '[redacted]')
      .trim()
      .slice(0, 160);

  const newObs: CommunityObservation = {
    id: `obs-${randomUUID()}`,
    neighborhood: redact(input.neighborhood) || 'Local Neighborhood',
    city: redact(input.city) || 'Local Area',
    category: input.category,
    severity: input.severity,
    description: redact(input.description),
    verificationType: 'user_submitted',
    upvotes: 1,
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('community_observations').insert({
        neighborhood: newObs.neighborhood,
        city: newObs.city,
        category: newObs.category,
        severity: newObs.severity,
        description: newObs.description,
        verification_type: 'user_submitted',
        upvotes: 1,
      });
    } catch {
      // Fall through to local store.
    }
  }

  const db = readLocalDb();
  db.observations = [newObs, ...db.observations].slice(0, 50);
  await writeLocalDb(db);
  return newObs;
}

export async function upvoteObservation(
  id: string,
  sessionId = DEFAULT_SESSION
): Promise<{ observations: CommunityObservation[]; alreadyVoted: boolean }> {
  const db = readLocalDb();
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
  const session = getSession(db, sessionId);
  const alreadyJoined = session.joinedChallengeIds.includes(challengeId);
  const count = session.challengeActionCounts[challengeId] ?? 0;

  if (action === 'join' && !alreadyJoined) {
    session.joinedChallengeIds.push(challengeId);
  } else if (action === 'log_action' && count < 10) {
    session.challengeActionCounts[challengeId] = count + 1;
    if (!alreadyJoined) session.joinedChallengeIds.push(challengeId);
  }

  const challenges = structuredClone(INITIAL_COMMUNITY_CHALLENGES).map((c) => ({
    ...c,
    participantsCount:
      c.id === challengeId && (!alreadyJoined || (action === 'log_action' && count === 0))
        ? c.participantsCount + 1
        : c.participantsCount,
    currentActions:
      c.id === challengeId && action === 'log_action' && count < 10
        ? c.currentActions + 1
        : c.currentActions,
    joined: session.joinedChallengeIds.includes(c.id),
  }));

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
