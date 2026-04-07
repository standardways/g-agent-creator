# Architecture

`G-Agent Creator` has two layers:

1. the skill itself
2. the generated agent product

## Skill Layer

The skill layer lives at the repo root and contains:

- [SKILL.md](../SKILL.md)
- `scripts/create_agent.py`
- `assets/templates/agent-studio/`
- `references/`

Its job is to generate and evolve a production-ready agent app.

## Generated Product Layer

The bundled template is a monorepo with:

- `apps/core`: Node/TypeScript runtime and APIs
- `apps/shell`: Flutter operator shell
- `agents/`: built-in role definitions
- `plugins/`: runtime plugins
- `skills/`: project-local skills
- `infra/`: deployment and policy assets
- `knowledge/`: wiki-oriented knowledge plane
- `memory/`: continuity files

## Design Direction

The product is intentionally broader than a coding shell.

It aims to be an agent operating system with:

- company and governance primitives
- workflows, queueing, tasks, and recipes
- knowledge wiki mode and retrieval
- code graph mode
- operator console and doctor tooling
- hardened execution options
- prompt-injection-aware context handling

## Core Principle

Every major change should improve the generated product, not just make the source repo look richer.
