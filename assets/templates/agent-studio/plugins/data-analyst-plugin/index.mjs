import { readFile } from "node:fs/promises";

export async function register(ctx) {
  ctx.registerTool({
    name: "inspect_json",
    description: "Read a JSON file and return a structural summary for analysis tasks.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string" }
      },
      required: ["path"],
      additionalProperties: false
    },
    async execute(args, runtime) {
      const filePath = runtime.resolveWorkspace(runtime.workspacePath, String(args.path));
      const value = JSON.parse(await readFile(filePath, "utf8"));
      if (Array.isArray(value)) {
        return {
          kind: "array",
          length: value.length,
          sampleKeys: typeof value[0] === "object" && value[0] ? Object.keys(value[0]).slice(0, 12) : [],
        };
      }
      if (value && typeof value === "object") {
        return {
          kind: "object",
          keys: Object.keys(value).slice(0, 40),
        };
      }
      return {
        kind: typeof value,
        value,
      };
    }
  });
}
