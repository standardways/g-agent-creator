import { readdir } from "node:fs/promises";
import path from "node:path";

export async function register(ctx) {
  ctx.registerHook("on_session_start", async ({ sessionId }) => {
    console.log(`[plugin:example-runtime-plugin] session started: ${sessionId}`);
  });

  ctx.registerTool({
    name: "project_summary",
    description: "List top-level entries in the current workspace to build a quick project summary.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string" }
      },
      additionalProperties: false
    },
    async execute(args, runtime) {
      const basePath = runtime.resolveWorkspace(runtime.workspacePath, String(args.path ?? "."));
      const entries = await readdir(basePath, { withFileTypes: true });
      return entries.slice(0, 40).map((entry) => ({
        name: entry.name,
        kind: entry.isDirectory() ? "directory" : "file",
        path: path.join(basePath, entry.name)
      }));
    }
  });
}
