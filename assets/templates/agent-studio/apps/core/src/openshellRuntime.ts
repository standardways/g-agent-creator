import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SecurityPolicy } from "./securityRuntime.js";

export type OpenShellStatus = {
  available: boolean;
  version: string | null;
  sandboxName: string | null;
  remoteHost: string | null;
  policyPath: string | null;
  configured: boolean;
  approved: boolean;
  active: boolean;
};

function execText(command: string) {
  return new Promise<string>((resolve, reject) => {
    const shell = process.platform === "win32" ? "cmd.exe" : "sh";
    const args = process.platform === "win32" ? ["/c", command] : ["-lc", command];
    const child = spawn(shell, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    child.on("exit", (code) => {
      if (code === 0) resolve((stdout || stderr).trim());
      else reject(new Error((stderr || stdout || `command exited ${code}`).trim()));
    });
  });
}

export async function getOpenShellStatus(profile: Record<string, unknown> | undefined) {
  let version: string | null = null;
  let available = false;
  try {
    version = await execText("openshell --version");
    available = true;
  } catch {
    available = false;
  }
  return {
    available,
    version,
    sandboxName: typeof profile?.sandboxName === "string" ? profile.sandboxName : null,
    remoteHost: typeof profile?.remoteHost === "string" ? profile.remoteHost : null,
    policyPath: typeof profile?.policyPath === "string" ? profile.policyPath : null,
    configured: Boolean(profile?.configured),
    approved: Boolean(profile?.approved),
    active: Boolean(profile?.active),
  } satisfies OpenShellStatus;
}

export async function writeOpenShellPolicies(projectRoot: string, policy: SecurityPolicy) {
  const policyRoot = path.join(projectRoot, "infra", "openshell", "policies");
  await mkdir(policyRoot, { recursive: true });
  const networkPath = path.join(policyRoot, "network-policy.yaml");
  const filesystemPath = path.join(policyRoot, "filesystem-policy.yaml");
  const inferencePath = path.join(policyRoot, "inference-policy.yaml");
  const executionPath = path.join(policyRoot, "execution-policy.yaml");

  const networkYaml = [
    "version: v1",
    "network:",
    "  default: deny",
    "  allow:",
    ...policy.allowedOutboundDomains.map((domain) => `    - host: "${domain}"`),
  ].join("\n");
  const filesystemYaml = [
    "version: v1",
    "filesystem:",
    "  default: deny",
    '  allowRead:',
    '    - "/workspace"',
    '  allowWrite:',
    '    - "/workspace"',
  ].join("\n");
  const inferenceYaml = [
    "version: v1",
    "inference:",
    "  default: deny",
    "  allowProviders:",
    '    - "openai"',
    '    - "firebase"',
    '    - "gcloud"',
  ].join("\n");
  const executionYaml = [
    "version: v1",
    "execution:",
    "  default: deny",
    "  allowCommands:",
    '    - "git status"',
    '    - "git diff"',
    '    - "npm test"',
    '    - "flutter analyze"',
  ].join("\n");

  await writeFile(networkPath, `${networkYaml}\n`, "utf8");
  await writeFile(filesystemPath, `${filesystemYaml}\n`, "utf8");
  await writeFile(inferencePath, `${inferenceYaml}\n`, "utf8");
  await writeFile(executionPath, `${executionYaml}\n`, "utf8");

  return { policyRoot, networkPath, filesystemPath, inferencePath, executionPath };
}

export async function bootstrapOpenShell(projectRoot: string, profile: Record<string, unknown>, policy: SecurityPolicy) {
  const files = await writeOpenShellPolicies(projectRoot, policy);
  const sandboxName = typeof profile.sandboxName === "string" && profile.sandboxName.trim()
    ? profile.sandboxName.trim()
    : "agent-studio";
  const remoteHost = typeof profile.remoteHost === "string" && profile.remoteHost.trim()
    ? profile.remoteHost.trim()
    : null;
  const createCommand = remoteHost
    ? `openshell sandbox create --remote ${remoteHost} -- codex`
    : "openshell sandbox create -- codex";
  const applyPolicyCommand = `openshell policy set ${sandboxName} --policy ${files.networkPath} --wait`;
  return {
    files,
    sandboxName,
    remoteHost,
    createCommand,
    applyPolicyCommand,
  };
}

export async function applyOpenShellPolicy(profile: Record<string, unknown>) {
  const sandboxName = typeof profile.sandboxName === "string" && profile.sandboxName.trim()
    ? profile.sandboxName.trim()
    : "agent-studio";
  const policyPath = typeof profile.policyPath === "string" ? profile.policyPath : "";
  if (!policyPath) {
    throw new Error("OpenShell policyPath is not configured.");
  }
  const result = await execText(`openshell policy set ${sandboxName} --policy "${policyPath}" --wait`);
  return { output: result, sandboxName, policyPath };
}

export async function runInOpenShell(profile: Record<string, unknown>, command: string) {
  const sandboxName = typeof profile.sandboxName === "string" && profile.sandboxName.trim()
    ? profile.sandboxName.trim()
    : "";
  if (!sandboxName) {
    throw new Error("OpenShell sandboxName is not configured.");
  }
  const shellCommand = process.platform === "win32"
    ? `powershell -Command ${JSON.stringify(command)}`
    : `sh -lc ${JSON.stringify(command)}`;
  const runner = `openshell sandbox connect ${sandboxName}`;
  return new Promise<string>((resolve, reject) => {
    const shell = process.platform === "win32" ? "cmd.exe" : "sh";
    const args = process.platform === "win32" ? ["/c", runner] : ["-lc", runner];
    const child = spawn(shell, args, { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    child.stdin.write(`${shellCommand}\nexit\n`);
    child.stdin.end();
    child.on("exit", (code) => {
      if (code === 0) {
        resolve((stdout || stderr).trim());
      } else {
        reject(new Error((stderr || stdout || `OpenShell connect exited ${code}`).trim()));
      }
    });
  });
}
