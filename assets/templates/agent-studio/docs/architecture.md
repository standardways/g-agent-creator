# Architecture

The generated app is intentionally split into:

- `apps/shell`: Flutter desktop/web shell
- `apps/core`: Node agent core
- `agents/`: built-in agent role definitions
- `plugins/`: local runtime plugins
- `skills/`: local project skills
- `infra/`: Firebase and Cloud Run guidance

This keeps the default app small enough to understand while preserving extension seams for:

- tool plugins
- hook plugins
- custom agent roles
- MCP integration
- future automation and gateway layers

## Product Identity

The generated product is a general digital worker rather than a narrow coding-only assistant.

Its default role set should support:

- coding and implementation
- research and information synthesis
- writing and editing
- operational task execution
- review and verification
