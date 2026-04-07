export function buildConfigSchemaSnapshot(input: {
  company: Record<string, unknown>;
  codeGraph: Record<string, unknown>;
  distros: Record<string, unknown>;
  recipes: Record<string, unknown>;
  startupConfig: Record<string, unknown>;
  securityPolicy: Record<string, unknown>;
  promptInjection: Record<string, unknown>;
  contextEngine: Record<string, unknown>;
  knowledgeEngine: Record<string, unknown>;
  budget: Record<string, unknown>;
  runtimeProfiles: Record<string, unknown>;
  toolsets: Record<string, unknown>;
  providerRouting: Record<string, unknown>;
  skillsHub: Record<string, unknown>;
}) {
  return {
    sections: [
      {
        id: "company",
        title: "Company",
        endpoint: "/api/company/profile",
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            mission: { type: "string" },
            description: { type: "string" },
            status: { type: "string", enum: ["active", "paused", "archived"] },
          },
        },
        current: input.company,
      },
      {
        id: "codeGraph",
        title: "Code Graph",
        endpoint: "/api/code-graph/config",
        schema: {
          type: "object",
          properties: {
            enabled: { type: "boolean" },
            rootPath: { type: "string" },
            includeExtensions: { type: "array", items: { type: "string" } },
            maxFiles: { type: "number" },
          },
        },
        current: input.codeGraph,
      },
      {
        id: "distros",
        title: "Distro Profiles",
        endpoint: "/api/distros",
        schema: {
          type: "object",
          properties: {
            profiles: { type: "array", items: { type: "object" } },
          },
        },
        current: input.distros,
      },
      {
        id: "recipes",
        title: "Recipes",
        endpoint: "/api/recipes",
        schema: {
          type: "object",
          properties: {
            recipes: { type: "array", items: { type: "object" } },
          },
        },
        current: input.recipes,
      },
      {
        id: "startup",
        title: "Startup",
        endpoint: "/api/startup/config",
        schema: {
          type: "object",
          properties: {
            mode: { type: "string", enum: ["default", "bare", "autonomous"] },
            prewarmCodex: { type: "boolean" },
            enableAutomationLoop: { type: "boolean" },
            enableKairosLoop: { type: "boolean" },
            deferredDelayMs: { type: "number" },
          },
        },
        current: input.startupConfig,
      },
      {
        id: "security",
        title: "Security",
        endpoint: "/api/security/policy",
        schema: {
          type: "object",
          properties: {
            deploymentMode: { type: "string", enum: ["public_saas", "single_tenant", "local_dev"] },
            executionSecurityMode: { type: "string", enum: ["standard", "hardened", "openshell_hardened"] },
            strictAuth: { type: "boolean" },
            approvalPolicy: { type: "string", enum: ["deny_by_default", "interactive_approval", "trusted_session"] },
            allowPrivateNetwork: { type: "boolean" },
            redactSecrets: { type: "boolean" },
          },
        },
        current: input.securityPolicy,
      },
      {
        id: "contextEngine",
        title: "Context Engine",
        endpoint: "/api/context-engine",
        schema: {
          type: "object",
          properties: {
            active: { type: "string" },
            promptMode: { type: "string", enum: ["full", "minimal", "none"] },
            bootstrapMaxChars: { type: "number" },
            bootstrapTotalMaxChars: { type: "number" },
            bootstrapPromptTruncationWarning: { type: "boolean" },
          },
        },
        current: input.contextEngine,
      },
      {
        id: "promptInjection",
        title: "Prompt Injection Defense",
        endpoint: "/api/prompt-injection/config",
        schema: {
          type: "object",
          properties: {
            enabled: { type: "boolean" },
            mode: { type: "string", enum: ["annotate", "sanitize", "block_high_risk"] },
            annotateUntrustedToolOutput: { type: "boolean" },
            annotateUntrustedKnowledge: { type: "boolean" },
            blockHighRiskKnowledgeIngest: { type: "boolean" },
            redactSuspiciousLines: { type: "boolean" },
            maxWrappedChars: { type: "number" },
            recentEventLimit: { type: "number" },
          },
        },
        current: input.promptInjection,
      },
      {
        id: "knowledgeEngine",
        title: "Knowledge Engine",
        endpoint: "/api/knowledge/config",
        schema: {
          type: "object",
          properties: {
            enabled: { type: "boolean" },
            command: { type: "string" },
            defaultMode: { type: "string", enum: ["search", "vsearch", "query"] },
            defaultLimit: { type: "number" },
            wikiEnabled: { type: "boolean" },
            rawDir: { type: "string" },
            wikiDir: { type: "string" },
            indexFile: { type: "string" },
            logFile: { type: "string" },
            schemaFile: { type: "string" },
            autoFileAnswers: { type: "boolean" },
          },
        },
        current: input.knowledgeEngine,
      },
      {
        id: "budget",
        title: "Budget",
        endpoint: "/api/budget/config",
        schema: {
          type: "object",
          properties: {
            enabled: { type: "boolean" },
            monthlyUsdLimit: { type: "number" },
            alertThresholdUsd: { type: "number" },
            hardStop: { type: "boolean" },
          },
        },
        current: input.budget,
      },
      {
        id: "providers",
        title: "Providers",
        endpoint: "/api/providers/routing",
        schema: {
          type: "object",
          properties: {
            primaryModel: { type: "string" },
            fastModel: { type: "string" },
            researcherModel: { type: "string" },
            writerModel: { type: "string" },
            reviewerModel: { type: "string" },
          },
        },
        current: input.providerRouting,
      },
      {
        id: "runtimeProfiles",
        title: "Runtime Profiles",
        endpoint: "/api/runtime/profiles",
        schema: {
          type: "object",
          properties: {
            active: { type: "string" },
            profiles: { type: "object" },
          },
        },
        current: input.runtimeProfiles,
      },
      {
        id: "toolsets",
        title: "Toolsets",
        endpoint: "/api/toolsets",
        schema: {
          type: "object",
          properties: {
            active: { type: "string" },
            profiles: { type: "object" },
          },
        },
        current: input.toolsets,
      },
      {
        id: "skillsHub",
        title: "Skills Hub",
        endpoint: "/api/skills-hub",
        schema: {
          type: "object",
          properties: {
            externalRoots: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
        current: input.skillsHub,
      },
    ],
  };
}
