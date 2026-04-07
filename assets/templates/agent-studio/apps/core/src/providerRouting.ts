import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ProviderRouteConfig = {
  primaryModel: string;
  fastModel: string;
  researcherModel: string;
  writerModel: string;
  reviewerModel: string;
};

const DEFAULT_CONFIG: ProviderRouteConfig = {
  primaryModel: "gpt-4.1",
  fastModel: "gpt-4.1-mini",
  researcherModel: "gpt-4.1",
  writerModel: "gpt-4.1-mini",
  reviewerModel: "gpt-4.1-mini",
};

export async function loadProviderRouting(dataDir: string) {
  const filePath = path.join(dataDir, "provider-routing.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf8");
    return { filePath, config: DEFAULT_CONFIG };
  }
  return {
    filePath,
    config: { ...DEFAULT_CONFIG, ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<ProviderRouteConfig>) },
  };
}

export async function saveProviderRouting(dataDir: string, patch: Partial<ProviderRouteConfig>) {
  const loaded = await loadProviderRouting(dataDir);
  const next = { ...loaded.config, ...patch };
  await writeFile(loaded.filePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function chooseModel(config: ProviderRouteConfig, input: { prompt: string; role?: string }) {
  const role = input.role ?? "";
  const prompt = input.prompt.toLowerCase();

  if (role === "researcher") return { model: config.researcherModel, reason: "research-role" };
  if (role === "writer") return { model: config.writerModel, reason: "writer-role" };
  if (role === "reviewer") return { model: config.reviewerModel, reason: "reviewer-role" };

  const simple = prompt.length < 120 && !/code|error|debug|analy|investig|research|compare|review|refactor|tool|workspace/.test(prompt);
  if (simple) {
    return { model: config.fastModel, reason: "simple-turn" };
  }
  return { model: config.primaryModel, reason: "primary-turn" };
}
