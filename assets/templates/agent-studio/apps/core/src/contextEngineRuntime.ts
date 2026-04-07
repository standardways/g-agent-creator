import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promptInjectionGuardrailText } from "./promptInjectionRuntime.js";

export type ContextEngineInfo = {
  id: string;
  name: string;
  ownsCompaction?: boolean;
};

export type AssembleInput = {
  prompt: string;
  workspacePath?: string;
  environmentText: string;
  plannerNote?: string;
  rolePrompt?: string | null;
  compactionSummary?: string;
  recentMessages: Array<{ role: string; content: string }>;
};

export type AssembleResult = {
  messages: Array<{ role: string; content: string }>;
  estimatedTokens: number;
  systemPromptAddition?: string;
};

export interface ContextEngine {
  readonly info: ContextEngineInfo;
  assemble(input: AssembleInput): Promise<AssembleResult> | AssembleResult;
}

export type ContextEngineConfig = {
  active: string;
  promptMode: "full" | "minimal" | "none";
  bootstrapMaxChars: number;
  bootstrapTotalMaxChars: number;
  bootstrapPromptTruncationWarning: boolean;
};

const DEFAULT_CONFIG: ContextEngineConfig = {
  active: "legacy",
  promptMode: "full",
  bootstrapMaxChars: 3200,
  bootstrapTotalMaxChars: 4800,
  bootstrapPromptTruncationWarning: true,
};

const registry = new Map<string, ContextEngine>();

function estimateTokens(messages: Array<{ role: string; content: string }>) {
  return Math.ceil(messages.reduce((sum, item) => sum + item.content.length, 0) / 4);
}

function trimBootstrapSection(value: string, maxChars: number) {
  if (value.length <= maxChars) return { text: value, truncated: false };
  return {
    text: `${value.slice(0, Math.max(0, maxChars - 80))}\n...[truncated]`,
    truncated: true,
  };
}

const legacyEngine: ContextEngine = {
  info: {
    id: "legacy",
    name: "Legacy Context Engine",
    ownsCompaction: false,
  },
  assemble(input) {
    const sections = [
      `You are a general digital worker runtime. You can help with coding, research, writing, analysis, operations, and other computer-based knowledge work. Stay concise, safe, and outcome-oriented. Current workspace: ${input.workspacePath ?? "not set"}.`,
      promptInjectionGuardrailText(),
      input.rolePrompt ? `Active role:\n${input.rolePrompt}` : "",
      input.plannerNote ? `Planner note: ${input.plannerNote}` : "",
      input.compactionSummary ? `Earlier session summary:\n${input.compactionSummary}` : "",
      input.environmentText,
    ].filter(Boolean);

    const messages = [
      {
        role: "system",
        content: sections.join("\n\n"),
      },
      ...input.recentMessages,
      { role: "user", content: input.prompt },
    ];

    return {
      messages,
      estimatedTokens: estimateTokens(messages),
    };
  },
};

registry.set(legacyEngine.info.id, legacyEngine);

export function registerContextEngine(engine: ContextEngine) {
  registry.set(engine.info.id, engine);
}

export function listContextEngines() {
  return [...registry.values()].map((engine) => engine.info);
}

export function getContextEngine(id: string) {
  return registry.get(id);
}

export async function loadContextEngineConfig(dataDir: string) {
  const filePath = path.join(dataDir, "context-engine.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf8");
    return { filePath, config: DEFAULT_CONFIG };
  }
  return {
    filePath,
    config: { ...DEFAULT_CONFIG, ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<ContextEngineConfig>) },
  };
}

export async function saveContextEngineConfig(dataDir: string, patch: Partial<ContextEngineConfig>) {
  const loaded = await loadContextEngineConfig(dataDir);
  const next = { ...loaded.config, ...patch };
  await writeFile(loaded.filePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function assembleContext(
  dataDir: string,
  input: AssembleInput
) {
  const config = (await loadContextEngineConfig(dataDir)).config;
  const engine = registry.get(config.active);
  if (!engine) {
    throw new Error(`Context engine "${config.active}" is not registered.`);
  }

  const trimmedSections = [
    trimBootstrapSection(input.environmentText, config.bootstrapTotalMaxChars),
  ];
  const combinedEnvironment = trimmedSections.map((section) => section.text).join("\n\n");
  const warning = trimmedSections.some((section) => section.truncated) && config.bootstrapPromptTruncationWarning
    ? "Bootstrap content was truncated to stay within the context budget."
    : undefined;

  const promptForMode =
    config.promptMode === "none"
      ? null
      : config.promptMode === "minimal"
        ? { ...input, plannerNote: undefined, compactionSummary: undefined, environmentText: combinedEnvironment }
        : { ...input, environmentText: combinedEnvironment };

  if (!promptForMode) {
    const messages = [
      ...input.recentMessages,
      { role: "user", content: input.prompt },
    ];
    return {
      engine: engine.info,
      config,
      result: {
        messages,
        estimatedTokens: estimateTokens(messages),
      } satisfies AssembleResult,
      warning,
    };
  }

  return {
    engine: engine.info,
    config,
    result: await engine.assemble(promptForMode),
    warning,
  };
}
