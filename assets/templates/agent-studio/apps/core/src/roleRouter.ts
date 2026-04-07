type SessionMessage = {
  role: string;
  content: string;
};

export type RoleDecision = {
  role: string;
  confidence: number;
  reason: string;
};

const ROLE_KEYWORDS: Record<string, string[]> = {
  planner: ["plan", "roadmap", "approach", "sequence", "steps", "strategy"],
  reviewer: ["review", "audit", "risk", "regression", "verify", "check", "validate"],
  researcher: ["research", "investigate", "compare", "summarize findings", "gather information", "sources"],
  writer: ["write", "rewrite", "draft", "polish", "edit copy", "memo", "article", "email"],
  operator: ["run", "execute", "set up", "configure", "deploy", "automation", "workflow", "operations"],
  executor: ["build", "implement", "fix", "code", "debug", "refactor", "patch"],
};

export function inferRole(input: {
  prompt: string;
  recentMessages?: SessionMessage[];
  availableRoles: string[];
}): RoleDecision {
  const prompt = input.prompt.toLowerCase();
  const context = [prompt, ...(input.recentMessages ?? []).slice(-6).map((message) => message.content.toLowerCase())].join("\n");
  const scores = new Map<string, number>();

  for (const role of input.availableRoles) {
    scores.set(role, 0);
  }

  for (const [role, keywords] of Object.entries(ROLE_KEYWORDS)) {
    if (!scores.has(role)) continue;
    let score = 0;
    for (const keyword of keywords) {
      if (context.includes(keyword)) {
        score += 1;
      }
    }
    scores.set(role, (scores.get(role) ?? 0) + score);
  }

  if (/code|debug|stacktrace|error|file|workspace|tool|terminal/.test(context) && scores.has("executor")) {
    scores.set("executor", (scores.get("executor") ?? 0) + 2);
  }
  if (/research|find out|look up|compare|source/.test(context) && scores.has("researcher")) {
    scores.set("researcher", (scores.get("researcher") ?? 0) + 2);
  }
  if (/write|rewrite|polish|email|proposal|memo|summary/.test(context) && scores.has("writer")) {
    scores.set("writer", (scores.get("writer") ?? 0) + 2);
  }
  if (/deploy|configure|operate|run this|automation|cron|schedule/.test(context) && scores.has("operator")) {
    scores.set("operator", (scores.get("operator") ?? 0) + 2);
  }
  if (/plan|first step|approach|strategy/.test(context) && scores.has("planner")) {
    scores.set("planner", (scores.get("planner") ?? 0) + 2);
  }
  if (/review|verify|double-check|critique|validate/.test(context) && scores.has("reviewer")) {
    scores.set("reviewer", (scores.get("reviewer") ?? 0) + 2);
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const best = ranked[0] ?? ["executor", 0];
  const total = ranked.reduce((sum, [, score]) => sum + score, 0);
  const confidence = total > 0 ? best[1] / total : 0.3;

  return {
    role: best[0],
    confidence,
    reason: best[1] > 0 ? `matched role heuristics for ${best[0]}` : "defaulted to executor",
  };
}
