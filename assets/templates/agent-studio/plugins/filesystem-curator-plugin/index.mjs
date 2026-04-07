import { readdir } from "node:fs/promises";
import path from "node:path";

export async function register(ctx) {
  ctx.registerTool({
    name: "workspace_digest",
    description: "Summarize the top-level structure of the workspace for orientation tasks.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string" }
      },
      additionalProperties: false
    },
    async execute(args, runtime) {
      const workspace = runtime.resolveWorkspace(runtime.workspacePath, String(args.path ?? "."));
      const entries = await readdir(workspace, { withFileTypes: true });
      return entries.slice(0, 50).map((entry) => ({
        name: entry.name,
        kind: entry.isDirectory() ? "directory" : "file",
        path: path.join(workspace, entry.name)
      }));
    }
  });
}
