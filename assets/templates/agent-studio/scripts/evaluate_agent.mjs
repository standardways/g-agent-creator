import fs from "node:fs/promises";
import path from "node:path";

const backend = process.env.AGENT_BACKEND_URL ?? "http://127.0.0.1:4318";
const evalDir = new URL("../eval/tasks/", import.meta.url);
const taskFiles = await fs.readdir(evalDir);

const results = [];
for (const file of taskFiles.filter((name) => name.endsWith(".json"))) {
  const task = JSON.parse(await fs.readFile(new URL(file, evalDir), "utf8"));
  const sessionResponse = await fetch(`${backend}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: task.name }),
  });
  const session = await sessionResponse.json();

  const streamResponse = await fetch(`${backend}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: session.session.id,
      message: task.prompt,
      useSubagents: true,
    }),
  });
  const text = await streamResponse.text();
  const passed = task.expect.some((value) => text.toLowerCase().includes(String(value).toLowerCase()));
  results.push({ task: task.name, passed, preview: text.slice(0, 240) });
}

console.log(JSON.stringify(results, null, 2));
