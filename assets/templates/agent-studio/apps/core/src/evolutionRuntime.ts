import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

type Session = {
  id: string;
  title: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
};

type EvolutionState = {
  runs: number;
  lastRunAt?: string;
  lastSessionId?: string;
  generatedSkills: string[];
};

const DEFAULT_STATE: EvolutionState = {
  runs: 0,
  generatedSkills: [],
};

export async function loadEvolutionState(dataDir: string) {
  const stateFile = path.join(dataDir, "evolution.json");
  if (!existsSync(stateFile)) {
    return { state: DEFAULT_STATE, stateFile };
  }
  return {
    state: { ...DEFAULT_STATE, ...(JSON.parse(await readFile(stateFile, "utf8")) as EvolutionState) },
    stateFile,
  };
}

async function saveEvolutionState(stateFile: string, state: EvolutionState) {
  await writeFile(stateFile, JSON.stringify(state, null, 2), "utf8");
}

function skillSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "learned-skill";
}

function transcript(session: Session) {
  return session.messages
    .map((message) => `[${message.role.toUpperCase()}] ${message.content}`)
    .join("\n\n")
    .slice(0, 16_000);
}

function fallbackSkill(session: Session) {
  const title = skillSlug(session.title || session.id);
  return {
    slug: title,
    content: `---\nname: ${title}\ndescription: Learned from session ${session.id}. Use when the workspace needs the same troubleshooting or implementation pattern again.\n---\n\n# ${title}\n\n## Source\n\nLearned automatically from session \`${session.id}\`.\n\n## Conversation Summary\n\n${transcript(session).slice(0, 5000)}\n`,
  };
}

async function llmSkill(client: OpenAI, session: Session) {
  const response = await client.chat.completions.create({
    model: "gpt-4.1",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "Rewrite the session into a reusable local skill. Return JSON with keys slug and content. content must be a valid SKILL.md starting with YAML frontmatter containing only name and description.",
      },
      {
        role: "user",
        content: `Session title: ${session.title}\nSession id: ${session.id}\n\nTranscript:\n${transcript(session)}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { slug?: string; content?: string };
  return {
    slug: skillSlug(parsed.slug ?? session.title),
    content: parsed.content ?? fallbackSkill(session).content,
  };
}

export async function evolveFromSession(input: {
  projectRoot: string;
  dataDir: string;
  session: Session;
  client: OpenAI | null;
}) {
  const { state, stateFile } = await loadEvolutionState(input.dataDir);
  const learnedDir = path.join(input.projectRoot, "skills", "learned");
  await mkdir(learnedDir, { recursive: true });

  const learned = input.client ? await llmSkill(input.client, input.session) : fallbackSkill(input.session);
  const skillDir = path.join(learnedDir, learned.slug);
  await mkdir(skillDir, { recursive: true });
  await writeFile(path.join(skillDir, "SKILL.md"), learned.content, "utf8");

  const nextState: EvolutionState = {
    runs: state.runs + 1,
    lastRunAt: new Date().toISOString(),
    lastSessionId: input.session.id,
    generatedSkills: Array.from(new Set([...state.generatedSkills, learned.slug])),
  };
  await saveEvolutionState(stateFile, nextState);

  return {
    skillSlug: learned.slug,
    skillPath: path.join(skillDir, "SKILL.md"),
    state: nextState,
  };
}
