# Deployment

## Backend (Azure App Service)

- **App:** `irhis-api` (Azure App Service, Linux, Python 3.11), slot `Production`, region West Europe.
- **URL:** `https://irhis-api-czc8f3awe0c4eydv.westeurope-01.azurewebsites.net`
- **Database:** Azure Database for MySQL, reached through `DATABASE_URL`.
- **Process:** `gunicorn app:app` (`backend/Procfile`).

### CI/CD

`.github/workflows/main_irhis-api.yml` runs on every push to `main` (and manually via *Run workflow*):

1. **build**: sets up Python 3.11, installs `backend/requirements.txt` in a virtualenv to catch dependency errors, and uploads the `backend/` folder as an artifact.
2. **deploy**: logs in to Azure with OpenID Connect (client, tenant and subscription IDs are GitHub secrets) and deploys the artifact with `azure/webapps-deploy`. Azure's Oryx build installs the dependencies again on the server.

Only `backend/` is deployed. Changes to `frontend/` or `docs/` also trigger the workflow but do not change the running API.

### App settings

Set these in the Azure portal under the App Service's **Environment variables** (they are not in the repository):

| Setting | Value |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `SECRET_KEY` | Long random string |
| `FLASK_ENV` | `production` |
| `CORS_ALLOWED_ORIGINS` | Only if a browser client (e.g. an admin dashboard) calls the API |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` (set automatically when GitHub deployment was enabled) |

Do **not** set `DEV_AUTH_MODE` in production. Mock login is disabled anyway when `FLASK_ENV=production`.

### Database changes

Schema changes are manual: run the SQL against the Azure MySQL server (for example from Azure Data Studio or the `mysql` CLI) **before** deploying code that depends on it, and add the script to `backend/migrations/` with the next number.

### Rate limiting

The login limit (10/min per IP) is stored in memory. If the App Service is scaled to more than one instance, each instance keeps its own count.

## Mobile app (EAS Build)

- **Expo project:** `demoirhisn`, owner `joaosi98`, EAS project ID in `frontend/app.json`.
- **Identifiers:** Android package and iOS bundle ID `com.eucinno.irhis`.
- **Versions:** set in `frontend/app.json` (`version`, `ios.buildNumber`, `android.versionCode`). `eas.json` uses `appVersionSource: local` and `autoIncrement: false`, so **bump them by hand** before each store build.

### Build profiles (`frontend/eas.json`)

| Profile | Output | Use |
|---|---|---|
| `development` | Android APK / iOS internal build with the dev client | Daily development on physical phones |
| `preview` | Android APK (internal distribution) | Test builds for the team and the clinical phones |
| `production` | Android App Bundle (AAB) | Google Play |
| `testflight` | iOS store build | TestFlight / App Store |

```bash
cd frontend
eas build --profile preview --platform android
eas build --profile production --platform android
eas build --profile testflight --platform ios
eas submit --profile production --platform android   # or ios
```

### Signing

- **Android:** `frontend/android/app/build.gradle` signs both debug and release with the debug keystore, which is only acceptable for local builds. Store builds should use credentials managed by EAS (`eas credentials`).
- **iOS:** requires an Apple Developer account; EAS manages certificates and provisioning profiles.

### Native projects

`frontend/android` and `frontend/ios` are committed and have manual changes (package name, Bluetooth permissions, `Info.plist` entries). Running `npm run prebuild` (`expo prebuild --clean`) **regenerates them and discards those changes**; only do it on purpose and review the diff afterwards.

### Permissions declared

- **iOS** (`Info.plist` via `app.json`): Bluetooth (always), motion, camera, photo library, location when in use, microphone; background mode `bluetooth-central`.
- **Android** (`app.json`): Bluetooth scan/connect/advertise, fine and coarse location (needed for BLE scanning on older Android versions), activity recognition (step count), internet, external storage.

Several of these (camera, microphone, photo library, location on iOS) are not used by current features and may raise questions in store review. Remove them if they stay unused.
