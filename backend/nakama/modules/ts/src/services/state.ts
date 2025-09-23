import type { nkruntime } from "@heroiclabs/nakama-runtime";

export const COLLECTIONS = {
  session: "session",
  wanted: "wanted",
  loadout: "loadout",
  compliance: "compliance"
} as const;

type CollectionKey = keyof typeof COLLECTIONS;

export interface SessionRecord extends Record<string, unknown> {
  shardId: number;
  deviceId?: string;
  attestationId?: string;
  lastSeen: number;
  wallet?: string;
}

export interface WantedRecord extends Record<string, unknown> {
  level: number;
  heat: number;
  expiresAt: number;
}

export interface ComplianceRecord extends Record<string, unknown> {
  kycStatus: string;
  amlStatus: string;
  riskScore: number;
  lastCaseId?: string;
}

export async function readStorage<T>(
  nk: nkruntime.Nakama,
  userId: string,
  collection: CollectionKey,
  key: string
): Promise<T | undefined> {
  const objects = await nk.storageRead([{ collection: COLLECTIONS[collection], key, userId }]);
  if (!objects.length) {
    return undefined;
  }
  return objects[0].value as T;
}

export async function writeStorage<T extends Record<string, unknown>>(
  nk: nkruntime.Nakama,
  userId: string,
  collection: CollectionKey,
  key: string,
  value: T
): Promise<void> {
  await nk.storageWrite([
    {
      collection: COLLECTIONS[collection],
      key,
      userId,
      value
    }
  ]);
}

export async function loadSession(nk: nkruntime.Nakama, userId: string): Promise<SessionRecord | undefined> {
  return readStorage<SessionRecord>(nk, userId, "session", "profile");
}

export async function storeSession(nk: nkruntime.Nakama, userId: string, record: SessionRecord): Promise<void> {
  await writeStorage(nk, userId, "session", "profile", record);
}

export async function loadWanted(nk: nkruntime.Nakama, userId: string): Promise<WantedRecord | undefined> {
  return readStorage<WantedRecord>(nk, userId, "wanted", "status");
}

export async function storeWanted(nk: nkruntime.Nakama, userId: string, record: WantedRecord): Promise<void> {
  await writeStorage(nk, userId, "wanted", "status", record);
}

export async function clearWanted(nk: nkruntime.Nakama, userId: string): Promise<void> {
  await nk.storageDelete([
    {
      collection: COLLECTIONS.wanted,
      key: "status",
      userId
    }
  ]);
}

export async function loadCompliance(nk: nkruntime.Nakama, userId: string): Promise<ComplianceRecord | undefined> {
  return readStorage<ComplianceRecord>(nk, userId, "compliance", "profile");
}

export async function storeCompliance(nk: nkruntime.Nakama, userId: string, record: ComplianceRecord): Promise<void> {
  await writeStorage(nk, userId, "compliance", "profile", record);
}
