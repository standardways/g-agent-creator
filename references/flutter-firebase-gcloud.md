# Flutter + Firebase + GCloud Defaults

## Product Shape

Agent Creator generates:

- `apps/shell`: Flutter desktop + web shell
- `apps/core`: Node/TypeScript agent core
- Firebase Auth for sign-in
- Firestore for sessions and messages
- Storage for large artifacts
- Cloud Run for hosted web-mode execution

## Execution Modes

### Desktop Local Mode

- Flutter shell runs locally.
- The shell can launch the local Node core process.
- The shell talks to the core through `http://localhost:<port>`.
- Firebase is optional for local dev, but supported when configured.

### Web Remote Mode

- Flutter web app is hosted on Firebase Hosting.
- The app talks to the Cloud Run-hosted Node core.
- Firebase Auth signs users in.
- The Node core verifies tokens when strict auth is enabled.

## Firebase Responsibilities

- Auth: user identity and bearer tokens
- Firestore: session metadata, messages, and run state
- Storage: long tool results, logs, generated artifacts

Keep business/session state in Firestore and bulky payloads in Storage.

## Cloud Run Responsibilities

- agent loop execution
- tool execution
- streaming response events
- subagent orchestration
- auth verification and workspace safety enforcement

Avoid pushing long-running agent logic into Firebase Functions unless a small support task clearly belongs there.

## Configuration Strategy

### Flutter Shell

Use `--dart-define` values for:

- Firebase web/desktop config
- default backend URL
- default local backend port

### Node Core

Use `.env` or Cloud Run env vars for:

- OpenAI provider config
- Firebase admin service account values
- storage bucket
- auth strictness
- allowed workspace roots

## Recommended First Validation

1. Start the Node core locally.
2. Start the Flutter shell on Windows or web.
3. Confirm `/health`.
4. Send one prompt.
5. Confirm session creation and message persistence.
6. Confirm large tool output creates an artifact reference.
