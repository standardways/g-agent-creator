import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type TelemetryState = {
  latestTokenUsage: Record<string, unknown>;
  latestRateLimits: Record<string, unknown>;
  latestModelReroute: Record<string, unknown>;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedUsd: number;
  updatedAt: string | null;
};

const DEFAULT_STATE: TelemetryState = {
  latestTokenUsage: {},
  latestRateLimits: {},
  latestModelReroute: {},
  totalInputTokens: 0,
  totalOutputTokens: 0,
  estimatedUsd: 0,
  updatedAt: null,
};

async function loadStateFile(dataDir: string) {
  const filePath = path.join(dataDir, "telemetry.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { filePath, state: DEFAULT_STATE };
  }
  return {
    filePath,
    state: {
      ...DEFAULT_STATE,
      ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<TelemetryState>),
    },
  };
}

async function saveStateFile(filePath: string, state: TelemetryState) {
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

function numberAt(value: unknown, keys: string[]) {
  if (!value || typeof value !== "object") return 0;
  for (const key of keys) {
    const raw = (value as Record<string, unknown>)[key];
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  }
  return 0;
}

function estimateUsd(inputTokens: number, outputTokens: number) {
  const inputCost = (inputTokens / 1_000_000) * 2.0;
  const outputCost = (outputTokens / 1_000_000) * 8.0;
  return Number((inputCost + outputCost).toFixed(6));
}

export async function loadTelemetryState(dataDir: string) {
  return (await loadStateFile(dataDir)).state;
}

export async function updateTokenTelemetry(dataDir: string, tokenUsage: Record<string, unknown>) {
  const loaded = await loadStateFile(dataDir);
  const inputTokens = numberAt(tokenUsage, [
    "inputTokens",
    "input_tokens",
    "promptTokens",
    "prompt_tokens",
  ]);
  const outputTokens = numberAt(tokenUsage, [
    "outputTokens",
    "output_tokens",
    "completionTokens",
    "completion_tokens",
  ]);
  const next: TelemetryState = {
    ...loaded.state,
    latestTokenUsage: tokenUsage,
    totalInputTokens: loaded.state.totalInputTokens + inputTokens,
    totalOutputTokens: loaded.state.totalOutputTokens + outputTokens,
    estimatedUsd: estimateUsd(
      loaded.state.totalInputTokens + inputTokens,
      loaded.state.totalOutputTokens + outputTokens
    ),
    updatedAt: new Date().toISOString(),
  };
  await saveStateFile(loaded.filePath, next);
  return next;
}

export async function updateRateLimitTelemetry(dataDir: string, rateLimits: Record<string, unknown>) {
  const loaded = await loadStateFile(dataDir);
  const next: TelemetryState = {
    ...loaded.state,
    latestRateLimits: rateLimits,
    updatedAt: new Date().toISOString(),
  };
  await saveStateFile(loaded.filePath, next);
  return next;
}

export async function updateModelRerouteTelemetry(dataDir: string, reroute: Record<string, unknown>) {
  const loaded = await loadStateFile(dataDir);
  const next: TelemetryState = {
    ...loaded.state,
    latestModelReroute: reroute,
    updatedAt: new Date().toISOString(),
  };
  await saveStateFile(loaded.filePath, next);
  return next;
}
