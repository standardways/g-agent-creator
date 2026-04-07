# G-Agent Creator

`G-Agent Creator` is an open-source Codex skill for generating real standalone digital-worker products.

It does not scaffold toy demos. It generates a runnable agent monorepo built around:

- a Flutter desktop/web shell
- a Node/TypeScript core runtime
- Firebase Auth, Firestore, and Storage
- Google Cloud Run for hosted execution

The bundled template is opinionated toward serious agent products: company mode, workflows, queueing, knowledge wiki mode, code graph mode, provider routing, recipes, distros, budgets, Codex-backed Ultraplan, OpenShell-aware hardening, and prompt-injection defenses are already in the box.

## What This Repo Contains

- [SKILL.md](./SKILL.md): the Codex skill entrypoint
- `scripts/create_agent.py`: generator that copies and parameterizes the bundled template
- `assets/templates/agent-studio/`: the production-ready template monorepo
- `references/`: upstream research and audit notes used to shape the template
- `agents/`: skill metadata used by Codex surfaces

## Quick Start

Clone the repo, then install it into your local Codex skills directory however you normally manage local skills.

To generate a new agent project:

```powershell
python scripts/create_agent.py "My Agent"
```

Common flags:

```powershell
python scripts/create_agent.py "My Agent" `
  --output-root "C:\Projects" `
  --firebase-project-id "my-project-id" `
  --cloud-run-url "https://my-service.run.app" `
  --backend-port 4318 `
  --force
```

By default, generated projects are created in the current working directory.

## What The Generated Agent Includes

- Flutter shell in `apps/shell`
- Node/TypeScript core in `apps/core`
- local and hosted runtime paths
- Firestore-backed session storage when Firebase admin is configured
- Codex bridge integration
- company goals and assignees
- workflows, queue, task registry, recipes, and automations
- QMD-backed knowledge retrieval
- markdown wiki knowledge mode
- code graph mode and graph report generation
- provider catalog, permission store, distros, budgets
- OpenShell-aware hardening path
- prompt-injection defense for tool and knowledge reentry
- doctor diagnostics and schema-driven control plane

## Documentation

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [SECURITY.md](./SECURITY.md)
- [docs/architecture.md](./docs/architecture.md)
- [docs/development.md](./docs/development.md)
- [docs/references.md](./docs/references.md)

## Contributor Workflow

The normal workflow for contributors is:

1. update the skill files or bundled template
2. generate a fresh sample agent with `scripts/create_agent.py`
3. validate the generated sample
4. iterate until the generated product is actually better

At minimum, validate a generated sample with:

```powershell
npm run build:core
cd apps/shell
flutter analyze
```

## License

This repo is licensed under [Apache-2.0](./LICENSE).
