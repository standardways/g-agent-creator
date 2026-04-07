export async function register(ctx) {
  ctx.registerTool({
    name: "draft_outline",
    description: "Turn a topic into a concise structured outline for writing tasks.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string" },
        audience: { type: "string" }
      },
      required: ["topic"],
      additionalProperties: false
    },
    async execute(args) {
      const topic = String(args.topic ?? "");
      const audience = String(args.audience ?? "general audience");
      return {
        topic,
        audience,
        outline: [
          "Goal",
          "Context",
          "Key points",
          "Risks or tradeoffs",
          "Recommended next steps"
        ]
      };
    }
  });
}
