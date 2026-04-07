# Contributing

Thanks for helping make `G-Agent Creator` better.

The standard here is simple: changes should improve the generated agent product, not just the source repo in isolation.

## Ground Rules

- keep the generated output runnable
- prefer extending the existing architecture over adding parallel systems
- keep the default product safe by default
- document new subsystems and operator-facing behavior
- avoid shipping local-machine assumptions, private paths, or generated junk

## Where To Work

- update [SKILL.md](./SKILL.md) when the skill instructions should change
- update `scripts/create_agent.py` when generation behavior should change
- update `assets/templates/agent-studio/` when the generated product should change
- update `references/` and `docs/` when architecture or upstream inspiration needs explanation

## Contributor Loop

1. make the source change
2. generate a fresh sample agent
3. validate the generated sample
4. confirm the product is actually better for operators and users

Example:

```powershell
python scripts/create_agent.py "smoke-agent" --output-root ".tmp" --force
cd .tmp\smoke-agent
npm install
npm run build:core
cd apps\shell
flutter pub get
flutter analyze
```

## What Good Changes Look Like

- simpler operator flow
- better safety defaults
- stronger generated docs
- clearer runtime boundaries
- better cross-platform behavior
- better generated product quality without making the template brittle

## What To Avoid

- repo-only polish that does not improve generated agents
- hardcoded local paths or personal metadata
- shipping generated IDE or platform ephemeral files
- adding insecure defaults for convenience
- introducing big subsystems without docs

## Pull Requests

A good pull request should explain:

- what changed in the generator or template
- why the generated agent is better
- how it was validated
- any tradeoffs or migration notes

If your change touches safety, runtime execution, approvals, MCP, knowledge ingestion, or prompt handling, include a short risk note in the PR description.
