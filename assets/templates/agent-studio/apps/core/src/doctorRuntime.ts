import { existsSync } from "node:fs";
import path from "node:path";
import type { RuntimePluginDiagnostic, RuntimePluginManifest } from "./pluginRuntime.js";
import type { SecurityFinding, SecurityPolicy } from "./securityRuntime.js";

export type DoctorFinding = {
  severity: "info" | "warning" | "error";
  subsystem: string;
  title: string;
  detail: string;
  repairAction?: string;
};

export function buildDoctorReport(input: {
  projectRoot: string;
  pluginDiagnostics: RuntimePluginDiagnostic[];
  pluginManifests: RuntimePluginManifest[];
  securityFindings: SecurityFinding[];
  promptInjectionFindings?: Array<{ severity: "info" | "warning" | "error"; title: string; detail: string }>;
  openshellStatus: Record<string, unknown>;
  contextEngineStatus: Record<string, unknown>;
  securityPolicy: SecurityPolicy;
  runtimeProfiles: Record<string, unknown>;
  budgetStatus?: Record<string, unknown>;
  ultraplanSummary?: { active: number; stuck: number };
}) {
  const findings: DoctorFinding[] = [];

  for (const diagnostic of input.pluginDiagnostics) {
    findings.push({
      severity: diagnostic.severity,
      subsystem: "plugins",
      title: diagnostic.pluginId,
      detail: diagnostic.message,
      repairAction: diagnostic.severity === "error" ? "review_plugin_manifest" : undefined,
    });
  }

  for (const finding of input.securityFindings) {
    findings.push({
      severity: finding.severity,
      subsystem: "security",
      title: finding.title,
      detail: finding.detail,
      repairAction:
        finding.id === "strict-auth-disabled" || finding.id === "wildcard-origin"
          ? "apply_safe_security_defaults"
          : undefined,
    });
  }

  for (const finding of input.promptInjectionFindings ?? []) {
    findings.push({
      severity: finding.severity,
      subsystem: "prompt-injection",
      title: finding.title,
      detail: finding.detail,
    });
  }

  if (input.pluginManifests.length === 0 && existsSync(path.join(input.projectRoot, "plugins"))) {
    findings.push({
      severity: "warning",
      subsystem: "plugins",
      title: "No loadable plugins",
      detail: "The plugins directory exists but no plugin manifests were loaded.",
    });
  }

  if (input.securityPolicy.executionSecurityMode === "openshell_hardened" && input.openshellStatus["available"] !== true) {
    findings.push({
      severity: "warning",
      subsystem: "openshell",
      title: "OpenShell unavailable",
      detail: "The hardened OpenShell mode is configured but the OpenShell CLI is not available.",
      repairAction: "switch_to_hardened_non_openshell",
    });
  }

  if (typeof input.contextEngineStatus["active"] === "string" && input.contextEngineStatus["resolved"] == false) {
    findings.push({
      severity: "error",
      subsystem: "context-engine",
      title: "Context engine missing",
      detail: `Configured context engine "${input.contextEngineStatus["active"]}" is not registered.`,
      repairAction: "reset_context_engine_legacy",
    });
  }

  for (const manifest of input.pluginManifests) {
    if (manifest.dangerousFlags && manifest.dangerousFlags.length > 0) {
      findings.push({
        severity: "info",
        subsystem: "plugins",
        title: `${manifest.id} dangerous flags`,
        detail: `Plugin declares ${manifest.dangerousFlags.length} dangerous config flag contract(s).`,
      });
    }
  }

  const runtimeProfiles = input.runtimeProfiles["profiles"];
  if (runtimeProfiles && typeof runtimeProfiles === "object") {
    for (const [name, raw] of Object.entries(runtimeProfiles as Record<string, Record<string, unknown>>)) {
      const backend = raw["backend"];
      const configured = raw["configured"];
      const approved = raw["approved"];
      const active = raw["active"];
      if (["ssh", "cloud", "docker", "openshell"].includes(String(backend)) && (configured !== true || approved !== true || active !== true)) {
        findings.push({
          severity: "info",
          subsystem: "runtime",
          title: `${name} not trusted`,
          detail: `${name} (${backend}) is present but not fully configured/approved/active.`,
          repairAction: "mark_runtime_safe_defaults",
        });
      }
    }
  }

  if ((input.budgetStatus?.["nearLimit"] ?? false) == true) {
    findings.push({
      severity: (input.budgetStatus?.["overLimit"] ?? false) == true ? "error" : "warning",
      subsystem: "budget",
      title: "Budget threshold reached",
      detail: `Estimated spend ${input.budgetStatus?.["estimatedUsd"]} exceeds configured threshold.`,
    });
  }

  if ((input.ultraplanSummary?.stuck ?? 0) > 0) {
    findings.push({
      severity: "warning",
      subsystem: "ultraplan",
      title: "Ultraplan sessions may be stuck",
      detail: `${input.ultraplanSummary?.stuck} planning session(s) have exceeded the expected planning window.`,
    });
  }

  return {
    findings,
    summary: {
      errors: findings.filter((finding) => finding.severity === "error").length,
      warnings: findings.filter((finding) => finding.severity === "warning").length,
      infos: findings.filter((finding) => finding.severity === "info").length,
    },
  };
}
