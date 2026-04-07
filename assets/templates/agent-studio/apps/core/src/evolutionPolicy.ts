import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type EvolutionPolicy = {
  enabled: boolean;
  autoLearn: boolean;
  minMessages: number;
  requireAssistantReply: boolean;
  tags: string[];
};

const DEFAULT_POLICY: EvolutionPolicy = {
  enabled: true,
  autoLearn: true,
  minMessages: 2,
  requireAssistantReply: true,
  tags: ["coding", "research", "writing", "ops"],
};

export async function loadEvolutionPolicy(dataDir: string) {
  const filePath = path.join(dataDir, "evolution-policy.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_POLICY, null, 2), "utf8");
    return { filePath, policy: DEFAULT_POLICY };
  }
  return {
    filePath,
    policy: { ...DEFAULT_POLICY, ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<EvolutionPolicy>) },
  };
}

export async function saveEvolutionPolicy(dataDir: string, patch: Partial<EvolutionPolicy>) {
  const loaded = await loadEvolutionPolicy(dataDir);
  const next = { ...loaded.policy, ...patch };
  await writeFile(loaded.filePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}
