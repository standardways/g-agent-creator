# Firebase

Use Firebase for:

- Auth
- Firestore session persistence
- Storage artifact persistence
- Hosting for Flutter web builds

## Suggested setup

1. Create a Firebase project.
2. Enable Email/Password Auth.
3. Create Firestore and Storage.
4. Copy `.firebaserc.example` to `.firebaserc`.
5. Build the shell web app, then deploy hosting:

```powershell
cd apps/shell
flutter build web --dart-define=DEFAULT_BACKEND_URL=__CLOUD_RUN_URL__
cd ..
firebase deploy --only hosting,firestore,storage
```
