import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type RecipeRecord = {
  id: string;
  title: string;
  description: string;
  instructions?: string;
  prompt?: string;
  activities?: string[];
  parameters?: Array<{
    key: string;
    type: "string" | "number" | "boolean";
    description: string;
    default?: string;
  }>;
  retry?: {
    attempts: number;
  };
};

type RecipeState = {
  recipes: RecipeRecord[];
};

const DEFAULT_STATE: RecipeState = {
  recipes: [
    {
      id: "deep-research",
      title: "Deep Research",
      description: "Run a research-heavy pass with structured synthesis.",
      prompt: "Research this topic deeply and return a concise but complete synthesis: {{topic}}",
      activities: ["research", "synthesize"],
      parameters: [
        { key: "topic", type: "string", description: "Topic or question to investigate" },
      ],
      retry: { attempts: 2 },
    },
    {
      id: "code-audit",
      title: "Code Audit",
      description: "Audit a codebase area for structure, risk, and follow-up work.",
      prompt: "Audit this code area, summarize structure, risks, and next actions: {{target}}",
      activities: ["inspect", "review"],
      parameters: [
        { key: "target", type: "string", description: "Path or scope to audit" },
      ],
    },
  ],
};

async function loadRecipeFile(dataDir: string) {
  const filePath = path.join(dataDir, "recipes.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return { filePath, state: DEFAULT_STATE };
  }
  return {
    filePath,
    state: {
      ...DEFAULT_STATE,
      ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<RecipeState>),
    },
  };
}

export async function listRecipes(dataDir: string) {
  return (await loadRecipeFile(dataDir)).state.recipes;
}

export async function saveRecipes(dataDir: string, recipes: RecipeRecord[]) {
  const loaded = await loadRecipeFile(dataDir);
  const next = { ...loaded.state, recipes };
  await writeFile(loaded.filePath, JSON.stringify(next, null, 2), "utf8");
  return next.recipes;
}

export function renderRecipePrompt(recipe: RecipeRecord, values: Record<string, string>) {
  let prompt = recipe.prompt ?? recipe.instructions ?? recipe.description;
  for (const [key, value] of Object.entries(values)) {
    prompt = prompt.replaceAll(`{{${key}}}`, value);
  }
  return prompt;
}
