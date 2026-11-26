import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import type {
  ChatMessage,
  CommunityChallenge,
  CommunityObservation,
  UserSettings,
} from '@/types/breathewise';
import {
  DEFAULT_USER_SETTINGS,
  INITIAL_COMMUNITY_CHALLENGES,
  INITIAL_COMMUNITY_OBSERVATIONS,
} from '@/lib/demo-data';

interface LocalDatabase {
  settings: UserSettings;
  observations: CommunityObservation[];
  challenges: CommunityChallenge[];
  chatHistory: ChatMessage[];
  joinedChallengeIds: string[];
  savedImpactFrequencies: Record<string, number>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'local-store.json');

function getDefaultDb(): LocalDatabase {
  return {
    settings: DEFAULT_USER_SETTINGS,
    observations: INITIAL_COMMUNITY_OBSERVATIONS,
    challenges: INITIAL_COMMUNITY_CHALLENGES,
    chatHistory: [],
    joinedChallengeIds: [],
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

function readLocalDb(): LocalDatabase {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      const initial = getDefaultDb();
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalDatabase>;
    const defaults = getDefaultDb();
    return {
      settings: {
        ...defaults.settings,
        ...(parsed.settings ?? {}),
        alerts: {
          ...defaults.settings.alerts,
          ...(parsed.settings?.alerts ?? {}),
        },
      },
      observations: parsed.observations ?? defaults.observations,
      challenges: parsed.challenges ?? defaults.challenges,
      chatHistory: parsed.chatHistory ?? [],
      joinedChallengeIds: parsed.joinedChallengeIds ?? [],
      savedImpactFrequencies:
        parsed.savedImpactFrequencies ?? defaults.savedImpactFrequencies,
    };
  } catch {
    return getDefaultDb();
  }
}

function writeLocalDb(db: LocalDatabase): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch {
    // Ignore read-only filesystem edge cases in serverless previews
  }
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function getSettings(): Promise<UserSettings> {
  const db = readLocalDb();
  return db.settings;
}

export async function updateSettings(
  patch: Partial<UserSettings>
): Promise<UserSettings> {
  const db = readLocalDb();
  db.settings = {
    ...db.settings,
    ...patch,
    alerts: {
      ...db.settings.alerts,
      ...(patch.alerts ?? {}),
    },
  };
  writeLocalDb(db);
  return db.settings;
}

export async function getCommunityData(): Promise<{
  observations: CommunityObservation[];
  challenges: CommunityChallenge[];
  storageBackend: 'supabase' | 'local_json';
}> {
  const db = readLocalDb();
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: obsData } = await supabase
        .from('community_observations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (obsData && obsData.length > 0) {
        const mappedObs: CommunityObservation[] = obsData.map((r) => ({
          id: r.id,
          neighborhood: r.neighborhood,
          city: r.city,
          category: r.category,
          severity: r.severity,
          description: r.description,
          verificationType: 'user_submitted',
          upvotes: r.upvotes ?? 0,
          createdAt: r.created_at,
        }));
        return {
          observations: mappedObs,
          challenges: db.challenges.map((c) => ({
            ...c,
            joined: db.joinedChallengeIds.includes(c.id),
          })),
          storageBackend: 'supabase',
        };
      }
    } catch {
      // Fallback to local store if tables not migrated yet
    }
  }

  return {
    observations: db.observations,
    challenges: db.challenges.map((c) => ({
      ...c,
      joined: db.joinedChallengeIds.includes(c.id),
    })),
    storageBackend: 'local_json',
  };
}

export async function addCommunityObservation(input: {
  neighborhood: string;
  city: string;
  category: CommunityObservation['category'];
  severity: CommunityObservation['severity'];
  description: string;
}): Promise<CommunityObservation> {
  // Privacy guard: strip any accidental coordinate-like strings from neighborhood label
  const cleanNeighborhood = input.neighborhood
    .replace(/\b\d{1,3}\.\d{3,}\b/g, '[redacted]')
    .trim()
    .slice(0, 80);

  const newObs: CommunityObservation = {
    id: `obs-${Date.now()}`,
    neighborhood: cleanNeighborhood || 'Local Neighborhood',
    city: input.city.trim().slice(0, 60),
    category: input.category,
    severity: input.severity,
    description: input.description.trim().slice(0, 320),
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
      // Fall through to local store
    }
  }

  const db = readLocalDb();
  db.observations = [newObs, ...db.observations].slice(0, 50);
  writeLocalDb(db);
  return newObs;
}

export async function upvoteObservation(id: string): Promise<CommunityObservation[]> {
  const db = readLocalDb();
  db.observations = db.observations.map((o) =>
    o.id === id ? { ...o, upvotes: o.upvotes + 1 } : o
  );
  writeLocalDb(db);
  return db.observations;
}

export async function actOnChallenge(
  challengeId: string,
  action: 'join' | 'log_action'
): Promise<CommunityChallenge[]> {
  const db = readLocalDb();
  const alreadyJoined = db.joinedChallengeIds.includes(challengeId);

  if (action === 'join' && !alreadyJoined) {
    db.joinedChallengeIds.push(challengeId);
    db.challenges = db.challenges.map((c) =>
      c.id === challengeId ? { ...c, participantsCount: c.participantsCount + 1 } : c
    );
  } else if (action === 'log_action') {
    if (!alreadyJoined) {
      db.joinedChallengeIds.push(challengeId);
    }
    db.challenges = db.challenges.map((c) =>
      c.id === challengeId
        ? {
            ...c,
            participantsCount: alreadyJoined ? c.participantsCount : c.participantsCount + 1,
            currentActions: c.currentActions + 1,
          }
        : c
    );
  }

  writeLocalDb(db);
  return db.challenges.map((c) => ({
    ...c,
    joined: db.joinedChallengeIds.includes(c.id),
  }));
}

export async function getChatHistory(): Promise<ChatMessage[]> {
  const db = readLocalDb();
  return db.chatHistory;
}

export async function appendChatMessages(messages: ChatMessage[]): Promise<void> {
  const db = readLocalDb();
  db.chatHistory = [...db.chatHistory, ...messages].slice(-40);
  writeLocalDb(db);
}

export async function clearChatHistory(): Promise<void> {
  const db = readLocalDb();
  db.chatHistory = [];
  writeLocalDb(db);
}

export async function getSavedImpactFrequencies(): Promise<Record<string, number>> {
  const db = readLocalDb();
  return db.savedImpactFrequencies;
}

export async function saveImpactFrequencies(
  frequencies: Record<string, number>
): Promise<Record<string, number>> {
  const db = readLocalDb();
  db.savedImpactFrequencies = frequencies;
  writeLocalDb(db);
  return db.savedImpactFrequencies;
}
