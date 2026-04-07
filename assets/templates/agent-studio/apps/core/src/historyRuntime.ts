type HistoryMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export function buildNormalizedHistory(messages: HistoryMessage[]) {
  const normalized = messages
    .filter((message) => {
      if (message.role !== "assistant") return true;
      const content = message.content.trim();
      if (!content) return false;
      if (content.startsWith("NO_REPLY")) return false;
      return true;
    })
    .map((message) => ({
      id: message.id,
      role: message.role,
      content:
        message.role === "system"
          ? message.content.replace(/Reasoning:\s*/g, "").trim()
          : message.content,
      createdAt: message.createdAt,
    }));

  return {
    items: normalized,
    summary: {
      total: messages.length,
      visible: normalized.length,
      hidden: messages.length - normalized.length,
    },
  };
}
