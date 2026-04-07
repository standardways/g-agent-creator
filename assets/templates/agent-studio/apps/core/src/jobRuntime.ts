import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type BackgroundJob = {
  id: string;
  ownerId: string;
  title: string;
  prompt: string;
  status: "queued" | "running" | "completed" | "failed";
  result?: string;
  createdAt: string;
  updatedAt: string;
};

type JobState = {
  jobs: BackgroundJob[];
};

const DEFAULT_STATE: JobState = {
  jobs: [],
};

export async function loadJobState(dataDir: string) {
  const filePath = path.join(dataDir, "jobs.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { filePath, state: DEFAULT_STATE };
  }
  return {
    filePath,
    state: { ...DEFAULT_STATE, ...(JSON.parse(await readFile(filePath, "utf8")) as JobState) },
  };
}

async function saveJobState(filePath: string, state: JobState) {
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

export async function listJobs(dataDir: string, ownerId: string) {
  return (await loadJobState(dataDir)).state.jobs.filter((job) => job.ownerId === ownerId);
}

export async function createJob(dataDir: string, job: BackgroundJob) {
  const loaded = await loadJobState(dataDir);
  loaded.state.jobs.unshift(job);
  await saveJobState(loaded.filePath, loaded.state);
  return job;
}

export async function updateJob(dataDir: string, id: string, patch: Partial<BackgroundJob>) {
  const loaded = await loadJobState(dataDir);
  loaded.state.jobs = loaded.state.jobs.map((job) =>
    job.id === id
      ? {
          ...job,
          ...patch,
          updatedAt: new Date().toISOString(),
        }
      : job
  );
  await saveJobState(loaded.filePath, loaded.state);
  return loaded.state.jobs.find((job) => job.id === id) ?? null;
}
