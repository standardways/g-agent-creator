import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type PresenceActor = {
  id: string;
  kind: "backend" | "shell" | "client" | "runtime";
  label: string;
  host?: string;
  version?: string;
  mode?: string;
  reason?: string;
  lastSeenAt: string;
};

type PresenceState = {
  actors: PresenceActor[];
};

const DEFAULT_STATE: PresenceState = {
  actors: [],
};

async function loadPresenceFile(dataDir: string) {
  const filePath = path.join(dataDir, "presence.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { filePath, state: DEFAULT_STATE };
  }
  return {
    filePath,
    state: {
      ...DEFAULT_STATE,
      ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<PresenceState>),
    },
  };
}

async function savePresenceFile(filePath: string, state: PresenceState) {
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

export async function listPresenceActors(dataDir: string) {
  return (await loadPresenceFile(dataDir)).state.actors.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}

export async function touchPresenceActor(dataDir: string, actor: PresenceActor) {
  const loaded = await loadPresenceFile(dataDir);
  const nextActors = loaded.state.actors.filter((entry) => entry.id !== actor.id);
  nextActors.unshift(actor);
  loaded.state.actors = nextActors.slice(0, 100);
  await savePresenceFile(loaded.filePath, loaded.state);
  return actor;
}
