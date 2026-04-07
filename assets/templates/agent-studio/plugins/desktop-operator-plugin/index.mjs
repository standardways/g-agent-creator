import { readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function register(ctx) {
  ctx.registerTool({
    name: "desktop_context",
    description: "Return local machine and workspace context useful for general operator work.",
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
      const samples = await Promise.all(
        entries.slice(0, 20).map(async (entry) => {
          const fullPath = path.join(workspace, entry.name);
          const info = await stat(fullPath);
          return {
            name: entry.name,
            kind: entry.isDirectory() ? "directory" : "file",
            size: info.size,
          };
        })
      );
      return {
        platform: os.platform(),
        release: os.release(),
        workspace,
        items: samples,
      };
    }
  });
}
