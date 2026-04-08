import fs from "node:fs/promises";
import type { KnowledgeConfig } from "./knowledgeRuntime.js";
import { ensureKnowledgeWikiVault } from "./knowledgeWikiVault.js";
import { compileKnowledgeWikiVault } from "./knowledgeWikiCompile.js";
import { lintKnowledgeWikiVault } from "./knowledgeWikiLint.js";

export type KnowledgeWikiStatusWarning = {
  code:
    | "vault-missing"
    | "bridge-disabled"
    | "bridge-enabled-with-isolated-mode";
  message: string;
};

export type KnowledgeWikiStatus = {
  vaultMode: KnowledgeConfig["vaultMode"];
  renderMode: KnowledgeConfig["renderMode"];
  vaultPath: string;
  vaultExists: boolean;
  pageCounts: Record<string, number>;
  sourceProvenanceCounts: Record<string, number>;
  bridge: KnowledgeConfig["bridge"];
  render: KnowledgeConfig["render"];
  warnings: KnowledgeWikiStatusWarning[];
  dashboards: {
    createBacklinks: boolean;
    createDashboards: boolean;
  };
};

async function pathExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function resolveKnowledgeWikiStatus(projectRoot: string, config: KnowledgeConfig): Promise<KnowledgeWikiStatus> {
  const layout = await ensureKnowledgeWikiVault(projectRoot, config);
  const vaultExists = await pathExists(layout.wikiRoot);
  const compile = vaultExists
    ? await compileKnowledgeWikiVault(projectRoot, config)
    : { pageCounts: { entity: 0, concept: 0, source: 0, synthesis: 0, report: 0 }, sourceProvenanceCounts: { native: 0, memory_entry: 0, dream_report: 0, project_memory: 0, other: 0 } };
  const warnings: KnowledgeWikiStatusWarning[] = [];
  if (!vaultExists) {
    warnings.push({ code: "vault-missing", message: "Knowledge wiki vault has not been initialized yet." });
  }
  if (config.vaultMode === "bridge" && !config.bridge.enabled) {
    warnings.push({ code: "bridge-disabled", message: "vaultMode is `bridge` but bridge.enabled is false." });
  }
  if (config.vaultMode !== "bridge" && config.bridge.enabled) {
    warnings.push({ code: "bridge-enabled-with-isolated-mode", message: "Bridge import is enabled while vaultMode is still `isolated`." });
  }
  return {
    vaultMode: config.vaultMode,
    renderMode: config.renderMode,
    vaultPath: layout.wikiRoot,
    vaultExists,
    pageCounts: compile.pageCounts,
    sourceProvenanceCounts: compile.sourceProvenanceCounts,
    bridge: config.bridge,
    render: config.render,
    warnings,
    dashboards: {
      createBacklinks: config.render.createBacklinks,
      createDashboards: config.render.createDashboards,
    },
  };
}

export async function buildKnowledgeWikiDoctor(projectRoot: string, config: KnowledgeConfig) {
  const status = await resolveKnowledgeWikiStatus(projectRoot, config);
  const lint = await lintKnowledgeWikiVault(projectRoot, config);
  const findings: Array<{ severity: "info" | "warning" | "error"; title: string; detail: string }> = [
    ...status.warnings.map((warning) => ({
      severity: (warning.code === "vault-missing" ? "warning" : "info") as "warning" | "info",
      title: warning.message,
      detail: warning.message,
    })),
    ...(lint.issueCount > 0
      ? [
          {
            severity: (lint.issues.some((issue) => issue.severity === "error") ? "warning" : "info") as "warning" | "info",
            title: "Knowledge wiki lint issues detected",
            detail: `${lint.issueCount} issue(s) found in the compiled knowledge wiki.`,
          },
        ]
      : []),
  ];
  return {
    status,
    lintSummary: {
      issueCount: lint.issueCount,
      reportPath: lint.reportPath,
    },
    findings,
  };
}

export function buildKnowledgeWikiPromptSupplement(config: KnowledgeConfig) {
  if (!config.wikiEnabled) return [] as string[];
  return [
    "## Compiled Knowledge Wiki",
    "Use the compiled wiki when the answer depends on durable project knowledge, source-backed notes, syntheses, entities, or concepts that should survive beyond one conversation.",
    "Workflow: `wiki_search` first, then `wiki_get` for the exact page you need when provenance matters.",
    "Use `wiki_apply` for bounded synthesis and metadata updates instead of rewriting wiki markdown freehand.",
    "Run `wiki_lint` after meaningful wiki updates before trusting the vault.",
  ];
}
