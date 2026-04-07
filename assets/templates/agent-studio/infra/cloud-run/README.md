# Cloud Run

Deploy the core service from `apps/core`.

## Example

```powershell
gcloud run deploy __AGENT_SLUG__-core `
  --source apps/core `
  --region us-central1 `
  --allow-unauthenticated=false
```

Set the same environment variables described in `apps/core/.env.example`.

Use Firebase Hosting for `apps/shell/build/web` and point the shell's backend URL to the deployed Cloud Run service.
