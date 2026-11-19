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

- **Expo project:** `demoirhisn`, owned by the EUC Expo account `euc-inovacao-portugal-lda` (project ID `5f6b9979-1140-45fc-bd2b-1a2bef360758`, also in `frontend/app.json`). Builds made before November 2026 belonged to an earlier, personal Expo project and are signed with a different key: uninstall them before installing a new build.
- **Identifiers:** Android package and iOS bundle ID `com.eucinno.irhis`.
- **Versions:** set in `frontend/app.json` (`version`, `ios.buildNumber`, `android.versionCode`). The OTA runtime version is separate; see [Over-the-air updates](#over-the-air-updates). `eas.json` uses `appVersionSource: local` and `autoIncrement: false`, so **bump them by hand** before each store build.

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

### Over-the-air updates

JavaScript and asset changes reach installed apps without a new build, through **EAS Update** (`expo-updates`).

**How it works**

1. A commit that touches `frontend/` lands on `main`.
2. `.github/workflows/app-update.yml` runs the checks:
   - `npm ci`;
   - `scripts/check-types.js`: no new TypeScript errors compared with `scripts/tsc-baseline.json`;
   - `scripts/check-runtime-version.js`: the runtime version is the same in all three native config files, and native code or dependencies did not change without a runtime-version bump.
3. If the checks pass, it publishes an update to the **`production`** channel (`eas update --channel production`).
4. Builds on that channel (the `preview`, `production` and `testflight` profiles) check for an update every time the app opens. They wait up to **5 seconds** for it, so a new update usually applies on the first launch after it is published. If the download takes longer, it applies on the next launch. Without internet, the app starts with the version it already has.

Pull requests that touch `frontend/` run the same checks without publishing.

The backend workflow (`main_irhis-api.yml`) also runs the backend tests before deploying.

**Runtime version: when a new build is needed**

An OTA update only contains JavaScript and assets, and only reaches builds with the same **runtime version** (currently `1.1.0`). It is set in three places that must match:

- `frontend/app.json` → `expo.runtimeVersion`
- `frontend/android/app/src/main/res/values/strings.xml` → `expo_runtime_version`
- `frontend/ios/demoirhisn/Supporting/Expo.plist` → `EXUpdatesRuntimeVersion`

When you change native code (`android/`, `ios/`), add or upgrade a package with native code, or upgrade the Expo SDK:

1. bump the runtime version in all three files (e.g. `1.2.0`);
2. make a new EAS build and install it on the phones.

The CI guard blocks the update if native files or dependencies changed and the runtime version did not. Updates published for the new runtime version only reach phones that have the new build.

**One-time setup**

1. Install the package in `frontend/`: `npx expo install expo-updates` (then `npx pod-install` on a Mac for iOS).
2. Create an Expo access token at expo.dev → Account settings → Access tokens, from a member of the `euc-inovacao-portugal-lda` Expo account. Add it to GitHub under Settings → Secrets and variables → Actions as **`EXPO_TOKEN`**.
3. Make a new build (`eas build --profile preview --platform android`, and/or iOS) and install it on every phone. Builds made before this setup do not contain `expo-updates` and will never receive OTA updates.

**Stopping or undoing an update**

- `eas channel:pause production` stops serving updates to the trial phones; `eas channel:resume production` resumes.
- `eas update:republish` re-publishes an earlier update, which rolls the phones back to it.

### npm version on EAS Build

The lock file only installs cleanly with recent npm 11 (11.19). `package.json` has an `eas-build-pre-install` script that installs `npm@11.19.1` on the EAS build server before dependencies are installed, and CI pins the same version. If you upgrade npm locally, update both.

### Signing

- **Android:** `frontend/android/app/build.gradle` signs both debug and release with the debug keystore, which is only acceptable for local builds. Store builds should use credentials managed by EAS (`eas credentials`).
- **iOS:** requires an Apple Developer account; EAS manages certificates and provisioning profiles.

### Native projects

`frontend/android` and `frontend/ios` are committed and have manual changes (package name, Bluetooth permissions, `Info.plist` entries). Running `npm run prebuild` (`expo prebuild --clean`) **regenerates them and discards those changes**; only do it on purpose and review the diff afterwards.

### Permissions declared

- **iOS** (`Info.plist` via `app.json`): Bluetooth (always), motion, camera, photo library, location when in use, microphone; background mode `bluetooth-central`.
- **Android** (`app.json`): Bluetooth scan/connect/advertise, fine and coarse location (needed for BLE scanning on older Android versions), activity recognition (step count), internet, external storage.

Several of these (camera, microphone, photo library, location on iOS) are not used by current features and may raise questions in store review. Remove them if they stay unused.
