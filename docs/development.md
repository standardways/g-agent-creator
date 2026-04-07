# Development

The repo itself is a skill plus a bundled template. Most meaningful development work happens by editing the template, then validating a generated sample.

## Prerequisites

- Python 3
- Node.js and npm
- Flutter SDK
- Git

## Generate A Sample

```powershell
python scripts/create_agent.py "smoke-agent" --output-root ".tmp" --force
```

## Validate A Sample

```powershell
cd .tmp\smoke-agent
npm install
npm run build:core
cd apps\shell
flutter pub get
flutter analyze
```

## Recommended Editing Areas

- `scripts/create_agent.py`
- `assets/templates/agent-studio/apps/core/src/`
- `assets/templates/agent-studio/apps/shell/lib/main.dart`
- `assets/templates/agent-studio/infra/`
- `references/` and `docs/`

## Release Hygiene

Before publishing:

- remove local absolute paths
- remove personal bundle identifiers
- remove generated platform ephemera
- confirm docs still match the generated product
- make sure the template remains safe by default
