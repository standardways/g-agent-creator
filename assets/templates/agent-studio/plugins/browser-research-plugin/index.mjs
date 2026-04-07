export async function register(ctx) {
  ctx.registerTool({
    name: "web_lookup",
    description: "Fetch a public URL and return a short text extract for research.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string" }
      },
      required: ["url"],
      additionalProperties: false
    },
    async execute(args) {
      const response = await fetch(String(args.url));
      const html = await response.text();
      return {
        status: response.status,
        extract: html.replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 3000),
      };
    }
  });
}
