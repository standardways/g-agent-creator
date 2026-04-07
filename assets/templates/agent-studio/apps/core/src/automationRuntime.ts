import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type AutomationJob = {
  id: string;
  ownerId: string;
  title: string;
  prompt: string;
  intervalMinutes: number;
  enabled: boolean;
  targetSessionTitle?: string;
  lastRunAt?: string;
  nextRunAt: string;
};

type AutomationState = {
  jobs: AutomationJob[];
};

const DEFAULT_STATE: AutomationState = {
  jobs: [],
};

export async function loadAutomationState(dataDir: string) {
  const filePath = path.join(dataDir, "automations.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { filePath, state: DEFAULT_STATE };
  }
  return {
    filePath,
    state: { ...DEFAULT_STATE, ...(JSON.parse(await readFile(filePath, "utf8")) as AutomationState) },
  };
}

async function saveAutomationState(filePath: string, state: AutomationState) {
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

export async function listAutomations(dataDir: string) {
  return (await loadAutomationState(dataDir)).state.jobs;
}

export async function createAutomation(dataDir: string, job: Omit<AutomationJob, "id" | "nextRunAt" | "lastRunAt"> & { id: string }) {
  const loaded = await loadAutomationState(dataDir);
  const now = new Date();
  const nextRunAt = new Date(now.getTime() + job.intervalMinutes * 60_000).toISOString();
  const nextJob: AutomationJob = {
    ...job,
    nextRunAt,
  };
  loaded.state.jobs.unshift(nextJob);
  await saveAutomationState(loaded.filePath, loaded.state);
  return nextJob;
}

export async function updateAutomation(dataDir: string, id: string, patch: Partial<AutomationJob>) {
  const loaded = await loadAutomationState(dataDir);
  loaded.state.jobs = loaded.state.jobs.map((job) => (job.id === id ? { ...job, ...patch } : job));
  await saveAutomationState(loaded.filePath, loaded.state);
  return loaded.state.jobs.find((job) => job.id === id) ?? null;
}

export function startAutomationLoop(input: {
  dataDir: string;
  onDue: (job: AutomationJob) => Promise<void>;
}) {
  let timer: NodeJS.Timeout | null = null;
  const tick = async () => {
    const loaded = await loadAutomationState(input.dataDir);
    const now = Date.now();
    let mutated = false;
    for (const job of loaded.state.jobs) {
      if (!job.enabled) continue;
      if (new Date(job.nextRunAt).getTime() > now) continue;
      await input.onDue(job);
      job.lastRunAt = new Date().toISOString();
      job.nextRunAt = new Date(Date.now() + job.intervalMinutes * 60_000).toISOString();
      mutated = true;
    }
    if (mutated) {
      await saveAutomationState(loaded.filePath, loaded.state);
    }
  };

  timer = setInterval(() => {
    void tick();
  }, 30_000);

  return () => {
    if (timer) clearInterval(timer);
  };
}
