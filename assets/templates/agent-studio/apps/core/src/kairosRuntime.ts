import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type KairosSignal = {
  id: string;
  kind: "stale_todo" | "stale_job" | "due_automation" | "workspace_attention";
  title: string;
  detail: string;
  createdAt: string;
};

type KairosState = {
  signals: KairosSignal[];
};

const DEFAULT_STATE: KairosState = {
  signals: [],
};

export async function loadKairosState(dataDir: string) {
  const filePath = path.join(dataDir, "kairos.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { filePath, state: DEFAULT_STATE };
  }
  return {
    filePath,
    state: { ...DEFAULT_STATE, ...(JSON.parse(await readFile(filePath, "utf8")) as KairosState) },
  };
}

async function saveKairosState(filePath: string, state: KairosState) {
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

export async function addKairosSignal(dataDir: string, signal: KairosSignal) {
  const loaded = await loadKairosState(dataDir);
  loaded.state.signals.unshift(signal);
  loaded.state.signals = loaded.state.signals.slice(0, 100);
  await saveKairosState(loaded.filePath, loaded.state);
  return signal;
}

export async function listKairosSignals(dataDir: string) {
  return (await loadKairosState(dataDir)).state.signals;
}

export async function scanKairosSignals(input: {
  dataDir: string;
  todos: Array<{ id: string; title: string; status: string; createdAt: string }>;
  jobs: Array<{ id: string; title: string; status: string; updatedAt: string }>;
}) {
  const now = Date.now();
  const emitted: KairosSignal[] = [];

  for (const todo of input.todos) {
    if (todo.status === "completed") continue;
    const ageHours = (now - new Date(todo.createdAt).getTime()) / 3_600_000;
    if (ageHours >= 6) {
      emitted.push(
        await addKairosSignal(input.dataDir, {
          id: `${todo.id}-stale`,
          kind: "stale_todo",
          title: todo.title,
          detail: `Todo has been unresolved for ${ageHours.toFixed(1)} hours.`,
          createdAt: new Date().toISOString(),
        })
      );
    }
  }

  for (const job of input.jobs) {
    if (job.status !== "queued" && job.status !== "running") continue;
    const ageHours = (now - new Date(job.updatedAt).getTime()) / 3_600_000;
    if (ageHours >= 1) {
      emitted.push(
        await addKairosSignal(input.dataDir, {
          id: `${job.id}-attention`,
          kind: "stale_job",
          title: job.title,
          detail: `Background job has been ${job.status} for ${ageHours.toFixed(1)} hours.`,
          createdAt: new Date().toISOString(),
        })
      );
    }
  }

  return emitted;
}
