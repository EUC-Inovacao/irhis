# Development guide

## Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| Node.js + npm | 20 LTS or newer | Mobile app |
| Python | 3.11 (matches Azure) | Backend |
| Expo account + EAS CLI (`npm i -g eas-cli`) | EAS CLI ≥ 16.9 | Cloud builds |
| Android Studio + SDK (API 33+) | latest stable | Local Android builds |
| macOS + Xcode | latest stable | Local iOS builds |

Bluetooth does **not** work in Expo Go or in emulators/simulators. To work on anything that touches the sensors you need a **development build installed on a physical phone**.

## Mobile app

```bash
cd frontend
npm install          # also applies the patches in frontend/patches/ (patch-package)
```

### Run on a phone (development build)

1. Install a development build on the phone, either:
   - from the cloud: `eas build --profile development --platform android` (or `ios`), then install the APK / internal build, or
   - locally: `npm run android` (Android Studio) or `npm run ios:device` (Xcode, iPhone connected by USB).
2. Start the bundler: `npm run start:dev-client`
3. Open the IRHIS development build on the phone and connect to the bundler.

The phone and the computer must be on the same network.

### Pointing the app at a backend

`frontend/config/env.ts` uses `EXPO_PUBLIC_API_URL` when set, otherwise the production Azure API. To use a local backend from a phone, use your computer's LAN IP:

```bash
# macOS / Linux
EXPO_PUBLIC_API_URL=http://192.168.1.50:5001 npm run start:dev-client
# Windows (PowerShell)
$env:EXPO_PUBLIC_API_URL="http://192.168.1.50:5001"; npm run start:dev-client
```

Restart the bundler after changing the variable. Make sure the firewall allows port 5001.

### Android SDK location

If Gradle cannot find the SDK, create `frontend/android/local.properties`:

```
sdk.dir=/path/to/Android/sdk
# Android Studio does not inherit the terminal PATH, so tell Gradle where Node.js is
# (find it with `which node`, or `where node` on Windows)
node.executable=/path/to/node
```

`node.executable` is read by a small patch to `expo-modules-autolinking` (`frontend/patches/`), applied automatically on `npm install`. When an Expo upgrade changes that package's version, the patch has to be regenerated for the new version.

`frontend/scripts/test-android-setup.sh` checks the Android toolchain.

### iOS on a physical iPhone

- Unlock the iPhone, connect it by USB and accept **Trust this computer**. Keep it unlocked during the build.
- Check it is visible: `xcrun devicectl list devices`
- "Device is busy": unlock the phone and trust the computer again. "No developer disk image": open Xcode once so it installs device support.
- If `npx expo run:ios --device` keeps failing, open `frontend/ios/demoirhisn.xcworkspace` in Xcode, choose the phone and press Run, or use an EAS development build.

### Type checking

```bash
cd frontend
npx tsc -p . --noEmit
```

TypeScript runs with `strict: false`, and the project still has about 70 older type errors. CI fails if the count goes up (`node scripts/check-types.js`, baseline in `scripts/tsc-baseline.json`). When you fix errors, lower the baseline in the same commit.

### Tests

Unit tests exist for the analysis code (`app/analysis/__tests__`, `app/io/__tests__`, `app/services/__tests__`), but **no test runner is configured** in `package.json`. Adding Jest (`jest-expo` preset) is needed before they can run.

## Backend

```bash
cd backend
python -m venv venv
# macOS / Linux:  source venv/bin/activate
# Windows:        venv\Scripts\activate
pip install -r requirements.txt
cp env.example .env      # then fill in the values
python app.py            # http://localhost:5001
```

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes, for real data | `mysql+pymysql://user:password@host:3306/dbname`. Without it the database is disabled |
| `MYSQL_SSL_CA` | no | Path to a CA certificate for MySQL TLS. If unset, the system trust store is used |
| `SECRET_KEY` | yes in production | JWT signing key. In development a fixed insecure fallback is used and a warning is printed |
| `FLASK_ENV` | no | `production` enforces `SECRET_KEY`, disables mock login and empty CORS defaults. Anything else is treated as development |
| `CORS_ALLOWED_ORIGINS` | no | Comma-separated origins for browser clients. The mobile app does not need CORS |
| `DEV_AUTH_MODE` | no | `mock` enables the two built-in test accounts (development only, see [api.md](api.md)) |
| `DEV_TEST_PASSWORD` | no | Password for the mock accounts (default `DevPass123`) |
| `PUBLIC_SIGNUP_ENABLED` | no | `true` re-enables the hidden public `POST /signup`. Off by default |
| `PORT` | no | Port for `python app.py` (default 5001) |

`.env` is git-ignored. Never commit real credentials. If any were ever committed, rotate them in the Azure portal.

### Database

There is no ORM and no migration tool. `backend/migrations/` holds SQL scripts that are run by hand on Azure MySQL: `001_metrics_table.sql` (`metrics`) and `002_feedback_table.sql` (`PatientFeedback`). Both use `CREATE TABLE IF NOT EXISTS`, so they are safe to run on an existing database.

`backend/create_doctor.py` creates a doctor account and prints its `IRHIS-D-…` access code (public sign-up is switched off). It asks for the password interactively and needs `DATABASE_URL`.

`backend/check_users.py` prints users, doctor ↔ patient assignments and unassigned patients from the configured database, which helps when debugging assignment problems.

### Tests

```bash
cd backend
python -m unittest discover -s tests -v
```

The tests mock the database layer, so they do not need `DATABASE_URL`.

## Repository conventions

- Branches: `feature/IRHIS-<jira-id>-short-name`, `fix/…`, `docs/…`, `chore/…`. Jira keys use the `IRHIS-` prefix.
- Commit messages: `feat: …`, `fix: …`, `docs: …`, `chore: …`, `refactor: …`.
- Open a pull request into `main`. Pushing to `main` deploys the backend (see [deployment.md](deployment.md)).
- Line endings are normalised by `.gitattributes` (LF in the repository). Editor and OS files (`.idea/`, `.vscode/`, `.expo/`, `.DS_Store`) are git-ignored.
- User-facing text goes in `frontend/app/i18n/locales/en.json` **and** `pt-PT.json`, never hard-coded in screens.
