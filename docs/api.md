# Backend API reference

Base URL (production): `https://irhis-api-czc8f3awe0c4eydv.westeurope-01.azurewebsites.net`
Local default: `http://localhost:5001`

All endpoints except `/`, `/login` and `/signup` require `Authorization: Bearer <JWT>`. Request and response bodies are JSON. Without a configured database (`DATABASE_URL`), most endpoints return `500 {"error": "Database not configured"}`.

Source: `backend/app.py`. This page is maintained by hand; when you add or change a route, update it here.

## Authentication and account

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/` | public | Health check |
| POST | `/login` | public, **10/min per IP** | Sign in. Body: `identifier` (or `accessCode` / `email`), `password`, optional `role`. Returns `{ token, user }` |
| POST | `/signup` | public | Create an account. Body: `password`, `role`, and either `email` + `name` or `useTemporaryAccessCode: true` (generates an `IRHIS-…` access code) |
| GET | `/me` | any | Current user |
| PUT | `/me/password` | any | Change own password. Body: `password` |

**Clinical-study access codes.** During the trial, users sign in with a generated code instead of an email: `IRHIS-XXXXXX` for patients and `IRHIS-D-XXXXXX` for clinicians. Codes are stored in the existing `users.Email` column as `<code>@irhis.local` (see `db.py`). Older patient accounts stored as `irhis-p-XXXXXX@irhis.local` still work, and are always returned in the current `IRHIS-XXXXXX` format. This is a temporary layer until a dedicated identity model exists.

**Mock login (development only).** With `DEV_AUTH_MODE=mock` and `FLASK_ENV` not set to `production`, the backend accepts two built-in accounts without a database: `IRHIS-D-900001` (doctor) and `IRHIS-900001` (patient), both with the password from `DEV_TEST_PASSWORD` (default `DevPass123`).

## Patients

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/patients/<patient_id>` | doctor, or the patient themself | Patient details |
| PUT | `/patients/<patient_id>/details` | doctor | Update details (age, height, weight, BMI, medical history…). Body: `{ details: {...} }` or the details object |
| PUT | `/patients/<patient_id>/feedback` | doctor, or the patient themself | Update the patient's feedback record. Body: `{ feedback: ... }` |
| GET | `/patients/unassigned` | doctor | Patients without a doctor |
| POST | `/patients/<patient_id>/assign-doctor` | doctor | Link the calling doctor to the patient |
| POST | `/patients/manual-registry` | doctor | Register a patient manually. Body: `password`, `sex`, `height`, `weight`, `bmi`, `medical_history` |

## Doctors

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/doctors/me/patients` | doctor | Own patients. Query: `search`, `sort` |
| GET | `/doctors/<doctor_id>/patients` | that doctor only | Same list by ID |
| GET | `/doctors/me/metrics-summary` | doctor | Latest metrics across own patients |
| GET | `/doctors/me/recent-activity` | doctor | Recent sessions across own patients |
| GET | `/doctors/me/trends` | doctor | Trend data across own patients |

## Exercises

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/exercise-types` | any | Available exercise types. Currently a fixed list in code (knee flexion, knee extension, hip flexion, hip abduction, ankle dorsiflexion…); there is no exercise-types table yet |
| GET | `/patients/<patient_id>/exercises` | doctor, or the patient themself | Exercises assigned to a patient |
| POST | `/patients/<patient_id>/exercises` | doctor linked to the patient | Assign an exercise. Body: `exercise_type_id`, `exercise_type_name`, `target_reps`, `target_sets` |
| PUT | `/patients/<patient_id>/exercises/<exercise_id>` | doctor linked to the patient | Update an assignment. Body: `exercise_type_name`, `target_reps` |

## Sessions, metrics and feedback

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/patients/<patient_id>/sessions` | linked doctor, or the patient themself | Create a session. Body: `exercise_type`, `exercise_description`, `repetitions`, `duration` |
| GET | `/patients/<patient_id>/sessions` | doctor, or the patient themself | A patient's sessions |
| GET | `/sessions/<session_id>` | linked doctor, or the patient themself | One session |
| PUT | `/sessions/<session_id>` | doctor linked to the patient | Update a session |
| DELETE | `/sessions/<session_id>` | doctor | Delete a session |
| POST | `/sessions/<session_id>/metrics` | linked doctor, or the patient themself | Store metrics for one joint and side. Body: `joint`, `side`, `repetitions`, `min/max/avg/p95 velocity`, `min/max/avg ROM`, `maxFlexion`, `maxExtension`, `centerMassDisplacement` (camelCase and snake_case both accepted) |
| GET | `/sessions/<session_id>/metrics` | doctor, or the patient themself | Metrics for one session |
| GET | `/patients/<patient_id>/metrics` | doctor, or the patient themself | All metrics for a patient. Query: `limit` |

## Admin

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/admin/fix-user-role` | doctor | Change a user's role. Body: `email`, `role` (`Patient` or `Doctor`) |

## Access rules

- A **patient** can only reach their own resources (`ensure_patient_resource_access`).
- A **doctor** must be linked to the patient (`patientdoctor`) for: creating sessions, reading or editing a single session, posting metrics, assigning or editing exercises, and the dashboard summaries.
- **Known gaps** (no doctor ↔ patient link check): `GET /patients/<id>`, `PUT /patients/<id>/details`, `PUT /patients/<id>/feedback`, `GET /patients/<id>/sessions`, `GET /patients/<id>/metrics`, `GET /sessions/<id>/metrics`, `GET /patients/<id>/exercises` and `DELETE /sessions/<id>`. Any authenticated doctor can use these on any patient. In addition, any doctor can link themselves to any patient through `POST /patients/<id>/assign-doctor`.
- `/admin/fix-user-role` lets any doctor change any user's role.

## Errors

Errors return `{ "error": "<message>" }` with the matching status code: `400` invalid input, `401` missing or invalid token, `403` not allowed, `404` not found, `429` login rate limit, `500` server or database error (details are logged server-side, not returned).
