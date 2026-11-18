# IRHIS

Mobile app and backend for sensor-based monitoring of hip and knee rehabilitation after surgery, developed by EUC Inovação Portugal in the EU-funded **IRHIS** project (grant 101160941).

Patients wear five **Movella DOT** inertial sensors on the thighs, lower legs and pelvis while doing their prescribed exercises. The app records the movement over Bluetooth, analyses it on the phone (joint angles, range of motion, velocities, repetitions, centre of mass), and sends the results to a clinical backend where clinicians follow each patient's progress.

## Status

- In use in the IRHIS **clinical trial** (ethics approval obtained, first patients tested). Technology readiness: **TRL 6** for the sensor-based monitoring system.
- **Knee** metrics are the validated core. **Hip** metrics are not reliable as absolute values; see [docs/sensor-limitations.md](docs/sensor-limitations.md).
- No metric has yet been validated against a reference system (goniometer or optical motion capture).

## What's in this repository

| Folder | Contents |
|---|---|
| [`frontend/`](frontend) | Mobile app: React Native 0.81, Expo SDK 54, TypeScript. Android and iOS |
| [`backend/`](backend) | REST API: Flask 3, Python 3.11, MySQL, JWT auth. Deployed to Azure App Service |
| [`docs/`](docs) | Documentation (start with [docs/README.md](docs/README.md)) |

## Quick start

**App** (needs a physical phone with a development build for anything that uses the sensors):

```bash
cd frontend
npm install
npm run start:dev-client
```

**Backend:**

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp env.example .env                                # set DATABASE_URL and SECRET_KEY
python app.py                                      # http://localhost:5001
```

To point the app at your local backend, start it with `EXPO_PUBLIC_API_URL=http://<your-computer-ip>:5001`. Full instructions: [docs/development.md](docs/development.md).

## How it fits together

```
Movella DOT x5 ──Bluetooth──▶ IRHIS app ──HTTPS──▶ Flask API on Azure ──▶ MySQL
                               connect sensors      users, patients,
                               record exercise      sessions, metrics,
                               analyse on phone     feedback
```

- **Sensors tab**: scan, connect and assign each sensor to a body position. This is independent of any exercise.
- **Live Session**: choose the patient and exercise, record, analyse and save.
- Raw sensor data stays on the phone; only computed metrics are uploaded.

Details: [docs/architecture.md](docs/architecture.md).

## Documentation

- [Architecture](docs/architecture.md)
- [Development setup](docs/development.md)
- [Deployment (Azure + EAS)](docs/deployment.md)
- [API reference](docs/api.md)
- [Movella DOT sensors](docs/sensors.md)
- [Sensor limitations and metric reliability](docs/sensor-limitations.md)
- [Analysis pipeline](docs/analysis-pipeline.md)
- [User manual](docs/user-manual.md)

## Deployment

- **Backend**: every push to `main` deploys `backend/` to the `irhis-api` Azure App Service via GitHub Actions.
- **App**: built with EAS (`frontend/eas.json` profiles: development, preview, production, testflight).

See [docs/deployment.md](docs/deployment.md).

## Contributing

Work on a branch (`feature/IRHIS-<jira-id>-…`, `fix/…`, `docs/…`), open a pull request into `main`, and update the relevant document in `docs/` in the same pull request. Conventions: [docs/development.md](docs/development.md#repository-conventions).

## License

This project is proprietary and confidential. All rights reserved.
