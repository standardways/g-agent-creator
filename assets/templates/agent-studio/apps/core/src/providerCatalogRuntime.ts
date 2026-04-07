import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProviderRouteConfig } from "./providerRouting.js";

export type ProviderCatalogEntry = {
  id: string;
  displayName: string;
  type: "builtin" | "openai_compatible" | "custom";
  description: string;
  authEnvVars: string[];
  defaultModel: string;
  knownModels: string[];
};

type ProviderCatalogState = {
  entries: ProviderCatalogEntry[];
};

const DEFAULT_CATALOG: ProviderCatalogState = {
  entries: [
    {
      id: "openai",
      displayName: "OpenAI",
      type: "builtin",
      description: "Primary OpenAI provider using the official API.",
      authEnvVars: ["OPENAI_API_KEY"],
      defaultModel: "gpt-4.1",
      knownModels: ["gpt-4.1", "gpt-4.1-mini", "gpt-realtime"],
    },
    {
      id: "openai_compatible",
      displayName: "OpenAI Compatible",
      type: "openai_compatible",
      description: "Any provider exposing an OpenAI-compatible endpoint.",
      authEnvVars: ["OPENAI_API_KEY", "OPENAI_BASE_URL"],
      defaultModel: "gpt-4.1",
      knownModels: [],
    },
    {
      id: "firebase_gcloud",
      displayName: "Firebase + GCloud",
      type: "custom",
      description: "Infra/auth/storage platform context provider.",
      authEnvVars: ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"],
      defaultModel: "gpt-4.1",
      knownModels: [],
    },
  ],
};

async function loadCatalogFile(dataDir: string) {
  const filePath = path.join(dataDir, "provider-catalog.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_CATALOG, null, 2), "utf8");
    return { filePath, state: DEFAULT_CATALOG };
  }
  return {
    filePath,
    state: {
      ...DEFAULT_CATALOG,
      ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<ProviderCatalogState>),
    },
  };
}

export async function loadProviderCatalog(dataDir: string) {
  return (await loadCatalogFile(dataDir)).state;
}

export async function saveProviderCatalog(dataDir: string, entries: ProviderCatalogEntry[]) {
  const loaded = await loadCatalogFile(dataDir);
  const next = { ...loaded.state, entries };
  await writeFile(loaded.filePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function providerCatalogSummary(catalog: ProviderCatalogState, routing: ProviderRouteConfig) {
  return {
    entries: catalog.entries,
    routing,
    activeModels: [
      routing.primaryModel,
      routing.fastModel,
      routing.researcherModel,
      routing.writerModel,
      routing.reviewerModel,
    ],
  };
}
