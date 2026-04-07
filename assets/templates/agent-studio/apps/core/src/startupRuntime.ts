import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type StartupCheckpoint = {
  name: string;
  at: number;
};

export type StartupMode = "default" | "bare" | "autonomous";

type StartupState = {
  checkpoints: StartupCheckpoint[];
};

export type StartupConfig = {
  mode: StartupMode;
  prewarmCodex: boolean;
  enableAutomationLoop: boolean;
  enableKairosLoop: boolean;
  deferredDelayMs: number;
};

const DEFAULT_STATE: StartupState = {
  checkpoints: [],
};

const DEFAULT_CONFIG: StartupConfig = {
  mode: "default",
  prewarmCodex: true,
  enableAutomationLoop: true,
  enableKairosLoop: true,
  deferredDelayMs: 500,
};

export class StartupProfiler {
  private readonly checkpoints: StartupCheckpoint[] = [];
  private readonly startedAt = Date.now();
  private readonly deferred: Array<() => Promise<void> | void> = [];
  private deferredRuns = 0;
  private lastDeferredAt: number | null = null;

  mark(name: string) {
    this.checkpoints.push({
      name,
      at: Date.now(),
    });
  }

  snapshot() {
    return {
      startedAt: this.startedAt,
      checkpoints: [...this.checkpoints],
      elapsedMs: Date.now() - this.startedAt,
      deferredRuns: this.deferredRuns,
      lastDeferredAt: this.lastDeferredAt,
    };
  }

  defer(task: () => Promise<void> | void) {
    this.deferred.push(task);
  }

  async runDeferred() {
    for (const task of this.deferred.splice(0)) {
      await task();
      this.deferredRuns += 1;
      this.lastDeferredAt = Date.now();
    }
  }
}

export async function loadStartupState(dataDir: string) {
  const filePath = path.join(dataDir, "startup.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { filePath, state: DEFAULT_STATE };
  }
  return {
    filePath,
    state: { ...DEFAULT_STATE, ...(JSON.parse(await readFile(filePath, "utf8")) as StartupState) },
  };
}

export async function saveStartupSnapshot(dataDir: string, profiler: StartupProfiler) {
  const loaded = await loadStartupState(dataDir);
  const next = {
    ...profiler.snapshot(),
  };
  await writeFile(loaded.filePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function loadStartupConfig(dataDir: string) {
  const filePath = path.join(dataDir, "startup-config.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf8");
    return { filePath, config: DEFAULT_CONFIG };
  }
  return {
    filePath,
    config: { ...DEFAULT_CONFIG, ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<StartupConfig>) },
  };
}

export async function saveStartupConfig(dataDir: string, patch: Partial<StartupConfig>) {
  const loaded = await loadStartupConfig(dataDir);
  const next = { ...loaded.config, ...patch };
  await writeFile(loaded.filePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}
