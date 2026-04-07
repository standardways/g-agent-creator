import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type BudgetConfig = {
  enabled: boolean;
  monthlyUsdLimit: number;
  alertThresholdUsd: number;
  hardStop: boolean;
};

const DEFAULT_CONFIG: BudgetConfig = {
  enabled: false,
  monthlyUsdLimit: 25,
  alertThresholdUsd: 20,
  hardStop: false,
};

async function loadBudgetFile(dataDir: string) {
  const filePath = path.join(dataDir, "budget.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf8");
    return { filePath, config: DEFAULT_CONFIG };
  }
  return {
    filePath,
    config: {
      ...DEFAULT_CONFIG,
      ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<BudgetConfig>),
    },
  };
}

export async function loadBudgetConfig(dataDir: string) {
  return (await loadBudgetFile(dataDir)).config;
}

export async function saveBudgetConfig(dataDir: string, patch: Partial<BudgetConfig>) {
  const loaded = await loadBudgetFile(dataDir);
  const next = { ...loaded.config, ...patch };
  await writeFile(loaded.filePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function budgetStatus(config: BudgetConfig, estimatedUsd: number) {
  const overLimit = config.enabled && estimatedUsd >= config.monthlyUsdLimit;
  const nearLimit = config.enabled && estimatedUsd >= config.alertThresholdUsd;
  return {
    ...config,
    estimatedUsd,
    nearLimit,
    overLimit,
    shouldBlock: overLimit && config.hardStop,
  };
}
