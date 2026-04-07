import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type QueueMode = "collect" | "followup" | "steer_backlog";
export type QueueOverflowPolicy = "old" | "new" | "summarize";

export type QueueEntry = {
  id: string;
  lane: string;
  ownerId: string;
  sourceKind: "background_job" | "workflow_mission" | "session_run";
  sourceId: string;
  title: string;
  parentId?: string | null;
  dependsOnIds?: string[];
  status: "queued" | "running" | "blocked" | "completed" | "failed" | "cancelled";
  mode: QueueMode;
  overflowPolicy: QueueOverflowPolicy;
  detail?: string;
  createdAt: string;
  updatedAt: string;
};

type QueueState = {
  entries: QueueEntry[];
};

const DEFAULT_STATE: QueueState = {
  entries: [],
};

async function loadQueueFile(dataDir: string) {
  const filePath = path.join(dataDir, "queue.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { filePath, state: DEFAULT_STATE };
  }
  return {
    filePath,
    state: {
      ...DEFAULT_STATE,
      ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<QueueState>),
    },
  };
}

async function saveQueueFile(filePath: string, state: QueueState) {
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

export async function listQueueEntries(dataDir: string, ownerId?: string) {
  const entries = (await loadQueueFile(dataDir)).state.entries;
  const filtered = ownerId ? entries.filter((entry) => entry.ownerId === ownerId) : entries;
  return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function enqueueEntry(dataDir: string, entry: QueueEntry, limitPerLane = 20) {
  const loaded = await loadQueueFile(dataDir);
  const sameLane = loaded.state.entries
    .filter((existing) => existing.ownerId === entry.ownerId && existing.lane === entry.lane && existing.status === "queued")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (sameLane.length >= limitPerLane) {
    if (entry.overflowPolicy === "new") {
      throw new Error(`Queue lane "${entry.lane}" is full and overflow policy is set to reject new entries.`);
    }
    if (entry.overflowPolicy === "old") {
      const oldest = sameLane[0];
      loaded.state.entries = loaded.state.entries.filter((existing) => existing.id !== oldest.id);
    }
    if (entry.overflowPolicy === "summarize") {
      const oldest = sameLane[0];
      if (oldest) {
        oldest.title = `[summarized] ${oldest.title}`;
        oldest.updatedAt = new Date().toISOString();
      }
    }
  }

  loaded.state.entries.unshift(entry);
  await saveQueueFile(loaded.filePath, loaded.state);
  return entry;
}

export async function updateQueueEntry(dataDir: string, id: string, patch: Partial<QueueEntry>) {
  const loaded = await loadQueueFile(dataDir);
  loaded.state.entries = loaded.state.entries.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          ...patch,
          updatedAt: new Date().toISOString(),
        }
      : entry
  );
  await saveQueueFile(loaded.filePath, loaded.state);
  return loaded.state.entries.find((entry) => entry.id === id) ?? null;
}

export async function queueSummary(dataDir: string, ownerId?: string) {
  const entries = await listQueueEntries(dataDir, ownerId);
  return {
    total: entries.length,
    queued: entries.filter((entry) => entry.status === "queued").length,
    running: entries.filter((entry) => entry.status === "running").length,
    blocked: entries.filter((entry) => entry.status === "blocked").length,
    completed: entries.filter((entry) => entry.status === "completed").length,
    failed: entries.filter((entry) => ["failed", "cancelled"].includes(entry.status)).length,
    lanes: [...new Set(entries.map((entry) => entry.lane))].length,
  };
}
