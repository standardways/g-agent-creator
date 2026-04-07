import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type RuntimeProfile = {
  active: string;
  profiles: Record<
    string,
    {
      backend: "local" | "docker" | "ssh" | "cloud" | "openshell";
      cwd: string;
      timeoutSeconds: number;
      notes?: string;
      shell?: string;
      dockerImage?: string;
      sshTarget?: string;
      cloudExecuteUrl?: string;
      env?: Record<string, string>;
      configured?: boolean;
      approved?: boolean;
      active?: boolean;
      openshellProfile?: {
        sandboxName: string;
        remoteHost?: string;
        policyPath?: string;
        compatibilityMode?: "best_effort" | "hard_requirement";
        enforceFilesystemPolicy?: boolean;
        enforceNetworkPolicy?: boolean;
        enforceInferencePolicy?: boolean;
      };
    }
  >;
};

const DEFAULT_PROFILE: RuntimeProfile = {
  active: "local",
  profiles: {
    local: {
      backend: "local",
      cwd: ".",
      timeoutSeconds: 180,
      notes: "Default local workspace execution.",
      shell: process.platform === "win32" ? "powershell.exe" : "sh",
    },
    docker: {
      backend: "docker",
      cwd: "/workspace",
      timeoutSeconds: 180,
      notes: "Containerized execution profile.",
      dockerImage: "node:20-bookworm",
    },
    ssh: {
      backend: "ssh",
      cwd: "~",
      timeoutSeconds: 180,
      notes: "Remote SSH execution profile.",
      sshTarget: "",
    },
    cloud: {
      backend: "cloud",
      cwd: "/workspace",
      timeoutSeconds: 180,
      notes: "Hosted remote execution profile.",
      cloudExecuteUrl: "",
      configured: false,
      approved: false,
      active: false,
    },
    openshell: {
      backend: "openshell",
      cwd: "/workspace",
      timeoutSeconds: 180,
      notes: "OpenShell hardened sandbox execution profile.",
      configured: false,
      approved: false,
      active: false,
      openshellProfile: {
        sandboxName: "agent-studio",
        remoteHost: "",
        policyPath: "infra/openshell/policies/network-policy.yaml",
        compatibilityMode: "best_effort",
        enforceFilesystemPolicy: true,
        enforceNetworkPolicy: true,
        enforceInferencePolicy: true,
      },
    },
  },
};

export async function loadRuntimeProfiles(dataDir: string) {
  const filePath = path.join(dataDir, "runtime-profiles.json");
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(DEFAULT_PROFILE, null, 2), "utf8");
    return { filePath, config: DEFAULT_PROFILE };
  }
  return {
    filePath,
    config: { ...DEFAULT_PROFILE, ...(JSON.parse(await readFile(filePath, "utf8")) as Partial<RuntimeProfile>) },
  };
}

export async function saveRuntimeProfiles(dataDir: string, patch: Partial<RuntimeProfile>) {
  const loaded = await loadRuntimeProfiles(dataDir);
  const next = {
    ...loaded.config,
    ...patch,
    profiles: {
      ...loaded.config.profiles,
      ...(patch.profiles ?? {}),
    },
  };
  await writeFile(loaded.filePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function activeRuntimeProfile(config: RuntimeProfile) {
  return config.profiles[config.active] ?? config.profiles.local;
}
