import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type PermissionRecord = {
  id: string;
  principal: string;
  toolName: string;
  allowed: boolean;
  contextHash: string;
  readableContext?: string;
  createdAt: string;
  expiryAt?: string | null;
};

type PermissionState = {
  records: PermissionRecord[];
};

const DEFAULT_STATE: PermissionState = {
  records: [],
};

async function loadPermissionFile(dataDir: string) {
  const filePath = path.join(dataDir, "permissions.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { filePath, state: DEFAULT_STATE };
  }
  return {
    filePath,
    state: {
      ...DEFAULT_STATE,
      ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<PermissionState>),
    },
  };
}

function hashContext(input: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function listPermissions(dataDir: string, principal?: string) {
  const records = (await loadPermissionFile(dataDir)).state.records;
  const now = new Date().toISOString();
  return records
    .filter((record) => !principal || record.principal === principal)
    .filter((record) => !record.expiryAt || record.expiryAt > now)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function recordPermission(dataDir: string, input: {
  id: string;
  principal: string;
  toolName: string;
  allowed: boolean;
  context: Record<string, unknown>;
  readableContext?: string;
  ttlMinutes?: number;
}) {
  const loaded = await loadPermissionFile(dataDir);
  const record: PermissionRecord = {
    id: input.id,
    principal: input.principal,
    toolName: input.toolName,
    allowed: input.allowed,
    contextHash: hashContext(input.context),
    readableContext: input.readableContext,
    createdAt: new Date().toISOString(),
    expiryAt: input.ttlMinutes ? new Date(Date.now() + input.ttlMinutes * 60_000).toISOString() : null,
  };
  loaded.state.records.unshift(record);
  loaded.state.records = loaded.state.records.slice(0, 500);
  await writeFile(loaded.filePath, JSON.stringify(loaded.state, null, 2), "utf8");
  return record;
}

export async function checkPermission(dataDir: string, input: {
  principal: string;
  toolName: string;
  context: Record<string, unknown>;
}) {
  const contextHash = hashContext(input.context);
  const now = new Date().toISOString();
  const records = await listPermissions(dataDir, input.principal);
  const record = records.find((entry) =>
    entry.toolName === input.toolName &&
    entry.contextHash === contextHash &&
    (!entry.expiryAt || entry.expiryAt > now)
  );
  return record ? record.allowed : null;
}
