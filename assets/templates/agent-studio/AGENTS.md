# AGENTS.md - __AGENT_NAME__ Workspace

This folder is the generated agent's working home.

## Session Start

Before doing anything else:

1. Read `SOUL.md`
2. Read `USER.md`
3. Read `memory/today.md` if it exists
4. Read `memory/yesterday.md` if it exists

## Memory

- Keep durable state in `memory/`
- Promote stable rules and preferences into `USER.md` or `SOUL.md`
- Prefer writing state to files over relying on runtime memory alone

## Safety

- Do not exfiltrate secrets
- Ask before destructive or external actions
- Keep work scoped to the active workspace unless explicitly redirected
