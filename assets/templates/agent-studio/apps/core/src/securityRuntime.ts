import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type DeploymentMode = "public_saas" | "single_tenant" | "local_dev";
export type ExecutionSecurityMode = "standard" | "hardened" | "openshell_hardened";
export type ApprovalPolicy = "deny_by_default" | "interactive_approval" | "trusted_session";

export type SecurityPolicy = {
  deploymentMode: DeploymentMode;
  executionSecurityMode: ExecutionSecurityMode;
  strictAuth: boolean;
  allowedOrigins: string[];
  allowedOutboundDomains: string[];
  allowedWebhookDomains: string[];
  allowedCloudExecDomains: string[];
  allowedMcpDomains: string[];
  approvalPolicy: ApprovalPolicy;
  allowPrivateNetwork: boolean;
  redactSecrets: boolean;
};

export type SecurityFinding = {
  id: string;
  severity: "info" | "warning" | "error";
  title: string;
  detail: string;
};

const DEFAULT_POLICY: SecurityPolicy = {
  deploymentMode: "public_saas",
  executionSecurityMode: "hardened",
  strictAuth: true,
  allowedOrigins: ["http://127.0.0.1:*", "http://localhost:*"],
  allowedOutboundDomains: [
    "api.openai.com",
    "identitytoolkit.googleapis.com",
    "firestore.googleapis.com",
    "storage.googleapis.com",
    "firebase.googleapis.com",
    "run.app",
    "googleapis.com",
  ],
  allowedWebhookDomains: [],
  allowedCloudExecDomains: [],
  allowedMcpDomains: [],
  approvalPolicy: "deny_by_default",
  allowPrivateNetwork: false,
  redactSecrets: true,
};

function wildcardToRegExp(pattern: string) {
  const escaped = pattern.replace(/[|\\{}()[\]^$+?.]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

function hostFromUrl(value: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal"
  );
}

export function domainAllowed(allowlist: string[], value: string) {
  const hostname = hostFromUrl(value) || value.toLowerCase();
  return allowlist.some((pattern) => wildcardToRegExp(pattern.toLowerCase()).test(hostname));
}

export function outboundAllowed(
  policy: SecurityPolicy,
  value: string,
  kind: "http" | "webhook" | "cloud_exec" | "mcp"
) {
  const hostname = hostFromUrl(value);
  if (!hostname) return false;
  if (!policy.allowPrivateNetwork && isPrivateHostname(hostname)) return false;
  const allowlist =
    kind === "webhook"
      ? policy.allowedWebhookDomains
      : kind === "cloud_exec"
        ? policy.allowedCloudExecDomains
        : kind === "mcp"
          ? policy.allowedMcpDomains
          : policy.allowedOutboundDomains;
  return domainAllowed(allowlist, hostname);
}

const secretKeyPattern = /(token|secret|password|privatekey|private_key|apikey|api_key|authorization)/i;

export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitive);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        secretKeyPattern.test(key) ? "[REDACTED]" : redactSensitive(child),
      ])
    );
  }
  if (typeof value === "string" && value.length > 24 && /(sk-|AIza|ya29\.|ghp_)/.test(value)) {
    return "[REDACTED]";
  }
  return value;
}

export async function loadSecurityPolicy(dataDir: string) {
  const filePath = path.join(dataDir, "security-policy.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_POLICY, null, 2), "utf8");
    return { filePath, policy: DEFAULT_POLICY };
  }
  return {
    filePath,
    policy: { ...DEFAULT_POLICY, ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<SecurityPolicy>) },
  };
}

export async function saveSecurityPolicy(dataDir: string, patch: Partial<SecurityPolicy>) {
  const loaded = await loadSecurityPolicy(dataDir);
  const next = {
    ...loaded.policy,
    ...patch,
  };
  await writeFile(loaded.filePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function findSecurityFindings(input: {
  policy: SecurityPolicy;
  marketplace?: Record<string, unknown>;
  openshellAvailable?: boolean;
  activeBackend?: string;
}) {
  const findings: SecurityFinding[] = [];
  const { policy, marketplace, openshellAvailable, activeBackend } = input;

  if (!policy.strictAuth && policy.deploymentMode !== "local_dev") {
    findings.push({
      id: "strict-auth-disabled",
      severity: "error",
      title: "Strict auth is disabled",
      detail: "Hosted or multi-user deployment should require auth by default.",
    });
  }
  if (policy.allowedOrigins.includes("*")) {
    findings.push({
      id: "wildcard-origin",
      severity: "error",
      title: "Wildcard CORS origin",
      detail: "Public deployment should not allow wildcard origins.",
    });
  }
  if (policy.allowedWebhookDomains.length === 0 && policy.deploymentMode === "public_saas") {
    findings.push({
      id: "no-webhook-allowlist",
      severity: "info",
      title: "Webhook routes are effectively disabled",
      detail: "This is safe by default. Add explicit domains before enabling external delivery.",
    });
  }
  if (policy.executionSecurityMode === "openshell_hardened" && !openshellAvailable) {
    findings.push({
      id: "openshell-missing",
      severity: "warning",
      title: "OpenShell not installed",
      detail: "OpenShell hardened mode is configured but the OpenShell CLI is unavailable.",
    });
  }
  if (
    marketplace &&
    Array.isArray(marketplace["unmanagedRuntimePlugins"]) &&
    (marketplace["unmanagedRuntimePlugins"] as unknown[]).length > 0
  ) {
    findings.push({
      id: "unmanaged-runtime-plugins",
      severity: "warning",
      title: "Unmanaged runtime plugins detected",
      detail: "Some runtime plugins exist on disk but are not declared in the marketplace manifest.",
    });
  }
  if (activeBackend && ["ssh", "cloud", "docker", "openshell"].includes(activeBackend) && policy.approvalPolicy === "trusted_session") {
    findings.push({
      id: "trusted-session-remote",
      severity: "warning",
      title: "Trusted session used with remote-capable backend",
      detail: "Remote or isolated backends should typically remain approval-gated.",
    });
  }

  return findings;
}

export function originAllowed(policy: SecurityPolicy, origin?: string | null) {
  if (!origin) return true;
  return policy.allowedOrigins.some((pattern) => wildcardToRegExp(pattern).test(origin));
}
