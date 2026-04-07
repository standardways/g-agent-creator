const invisibleChars = new Set([
  "\u200b",
  "\u200c",
  "\u200d",
  "\u2060",
  "\ufeff",
  "\u202a",
  "\u202b",
  "\u202c",
  "\u202d",
  "\u202e",
]);

const threatPatterns: Array<[RegExp, string]> = [
  [/ignore\s+(previous|all|above|prior)\s+instructions/i, "prompt_injection"],
  [/you\s+are\s+now\s+/i, "role_hijack"],
  [/do\s+not\s+tell\s+the\s+user/i, "deception_hide"],
  [/system\s+prompt\s+override/i, "sys_prompt_override"],
  [/disregard\s+(your|all|any)\s+(instructions|rules|guidelines)/i, "disregard_rules"],
  [/curl\s+[^\n]*\$\{?\w*(KEY|TOKEN|SECRET|PASSWORD|API)/i, "exfil_curl"],
  [/wget\s+[^\n]*\$\{?\w*(KEY|TOKEN|SECRET|PASSWORD|API)/i, "exfil_wget"],
  [/authorized_keys/i, "ssh_backdoor"],
  [/\$HOME\/\.ssh|~\/\.ssh/i, "ssh_access"],
];

export function scanMemoryContent(content: string) {
  for (const char of invisibleChars) {
    if (content.includes(char)) {
      return `Blocked invisible unicode U+${char.codePointAt(0)?.toString(16).padStart(4, "0")}`;
    }
  }
  for (const [pattern, label] of threatPatterns) {
    if (pattern.test(content)) {
      return `Blocked memory content matching ${label}`;
    }
  }
  return null;
}
