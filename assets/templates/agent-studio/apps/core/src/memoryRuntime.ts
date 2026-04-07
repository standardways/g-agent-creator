import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type MemoryEntry = {
  id: string;
  ownerId: string;
  title: string;
  content: string;
  createdAt: string;
};

type MemoryState = {
  entries: MemoryEntry[];
};

const DEFAULT_STATE: MemoryState = {
  entries: [],
};

export async function loadMemoryState(dataDir: string) {
  const filePath = path.join(dataDir, "memory.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { filePath, state: DEFAULT_STATE };
  }
  return {
    filePath,
    state: { ...DEFAULT_STATE, ...(JSON.parse(await readFile(filePath, "utf8")) as MemoryState) },
  };
}

async function saveMemoryState(filePath: string, state: MemoryState) {
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

export async function addMemory(dataDir: string, entry: MemoryEntry) {
  const loaded = await loadMemoryState(dataDir);
  loaded.state.entries.unshift(entry);
  await saveMemoryState(loaded.filePath, loaded.state);
  return entry;
}

export async function listMemory(dataDir: string, ownerId: string) {
  return (await loadMemoryState(dataDir)).state.entries.filter((entry) => entry.ownerId === ownerId);
}

export function searchTranscripts(input: {
  sessions: Array<{ id: string; title: string; updatedAt: string; messages: Array<{ content: string; role: string }> }>;
  query: string;
  limit?: number;
}) {
  const lowered = input.query.toLowerCase();
  const words = lowered.split(/\s+/).filter(Boolean);
  const scored = input.sessions
    .map((session) => {
      const haystack = [session.title, ...session.messages.map((message) => message.content)].join("\n").toLowerCase();
      const score = words.reduce((sum, word) => sum + (haystack.includes(word) ? 1 : 0), 0);
      return {
        id: session.id,
        title: session.title,
        updatedAt: session.updatedAt,
        score,
        preview: session.messages.map((message) => `[${message.role}] ${message.content}`).join("\n").slice(0, 1200),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.updatedAt.localeCompare(a.updatedAt));

  return scored.slice(0, input.limit ?? 5);
}
