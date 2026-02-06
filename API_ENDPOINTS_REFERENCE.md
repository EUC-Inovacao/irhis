# API Endpoints Reference

This document lists all available endpoints in the Azure API backend.

## Authentication Endpoints

### `POST /login`
Login with email, password, and role.
- **Body**: `{ "email": string, "password": string, "role": "patient" | "doctor" }`
- **Returns**: `{ "token": string, "user": { "id": string, "email": string, "name": string, "role": string } }`

### `POST /signup`
⚠️ **NOTE**: This endpoint currently has a bug - it references `users` and `patients` dictionaries that don't exist. It needs to be updated to use the database.

- **Body**: `{ "email": string, "password": string, "role": "patient" | "doctor", "name": string }`
- **Returns**: `{ "token": string, "user": { "id": string, "email": string, "name": string, "role": string } }`

### `GET /me`
Get current authenticated user.
- **Auth**: Required (Bearer token)
- **Returns**: Current user object

## Doctor Endpoints

### `GET /doctors/me/patients`
Get all patients assigned to the current doctor.
- **Auth**: Required (Doctor role)
- **Query params**: `?search=string&sort=name`
- **Returns**: `{ "items": [...], "confirmed": [...], "pending": [...] }`

### `GET /doctors/me/dashboard`
Get dashboard KPIs.
- **Auth**: Required (Doctor role)
- **Returns**: `{ "totalPatients": number, "activePatients": number, "completedPatients": number, "avgProgress": number }`

### `GET /doctors/me/latest-feedback`
Get latest feedback entries.
- **Auth**: Required (Doctor role)
- **Returns**: `{ "items": [...] }`

### `GET /doctors/me/metrics-summary`
Get metrics summary across patients.
- **Auth**: Required (Doctor role)
- **Returns**: Array of metrics summary items

### `GET /doctors/me/recent-activity`
Get recent activity (last 7 days).
- **Auth**: Required (Doctor role)
- **Returns**: Array of recent activity items

### `GET /doctors/me/trends`
Get trends data (last 30 days).
- **Auth**: Required (Doctor role)
- **Returns**: `{ "avgPain": number, "avgFatigue": number, "avgDifficulty": number }`

### `GET /doctors/<doctor_id>/patients`
Get patients for a specific doctor.
- **Auth**: Required (Doctor role)
- **Returns**: Array of patient objects

## Patient Endpoints

### `GET /patients/<patient_id>`
Get patient details.
- **Auth**: Required (Patient can only access own data, Doctor can access any)
- **Returns**: Patient object

### `GET /patients/unassigned`
Get unassigned patients (doctors only).
- **Auth**: Required (Doctor role)
- **Returns**: Array of unassigned patient objects

### `POST /patients/<patient_id>/assign-doctor`
Assign a patient to the current doctor.
- **Auth**: Required (Doctor role)
- **Returns**: Success message

### `POST /patients/manual-registry`
Register a new patient manually (doctors only).
- **Auth**: Required (Doctor role)
- **Body**: Patient registration data with required fields
- **Returns**: `{ "message": string, "patient_id": string, "generated_email": string }`

### `PUT /patients/<patient_id>/details`
Update patient details.
- **Auth**: Required (Doctor role)
- **Body**: Patient details object
- **Returns**: Updated patient object

### `PUT /patients/<patient_id>/recovery-process`
Update recovery process/exercises.
- **Auth**: Required (Doctor role)
- **Body**: Array of exercise objects
- **Returns**: Updated patient object

### `PUT /patients/<patient_id>/feedback`
Update patient feedback.
- **Auth**: Required (Patient or Doctor)
- **Body**: `{ "feedback": [...] }`
- **Returns**: Updated patient object

## Session Endpoints

### `GET /patients/<patient_id>/sessions`
Get all sessions for a patient.
- **Auth**: Required
- **Returns**: `{ "assigned": [...], "completed": [...] }`

### `POST /patients/<patient_id>/sessions`
Create/assign a new session to a patient.
- **Auth**: Required (Doctor role)
- **Body**: `{ "exercise_type": string, "exercise_description": string, "repetitions": number, "duration": number }`
- **Returns**: Session object

### `GET /sessions/<session_id>`
Get a specific session by ID.
- **Auth**: Required
- **Returns**: Session object

### `PUT /sessions/<session_id>`
Update a session.
- **Auth**: Required (Doctor role)
- **Body**: `{ "exercise_type": string, "exercise_description": string, "repetitions": number, "duration": number }`
- **Returns**: Updated session object

### `DELETE /sessions/<session_id>`
Delete a session.
- **Auth**: Required (Doctor role)
- **Returns**: Success message

## Metrics Endpoints

### `POST /sessions/<session_id>/metrics`
Add metrics to a session.
- **Auth**: Required
- **Body**: Metrics data
- **Returns**: Success message

### `GET /patients/<patient_id>/metrics`
Get metrics for a patient.
- **Auth**: Required
- **Returns**: Array of metrics

### `GET /sessions/<session_id>/metrics`
Get metrics for a session.
- **Auth**: Required
- **Returns**: Metrics object

## Movement Analysis Endpoints

### `GET /movement/health`
Check movement analysis API health.
- **Auth**: Required
- **Returns**: Health status

### `POST /movement/analyze`
Analyze movement data file.
- **Auth**: Required
- **Body**: Form data with file
- **Returns**: Analysis results

### `GET /patients/<patient_id>/movement-analyses`
Get movement analysis history for a patient.
- **Auth**: Required
- **Returns**: Array of analyses

## Known Issues

1. **`POST /signup`**: Currently has a bug - references non-existent `users` and `patients` dictionaries. Needs to be updated to use database functions like `create_manual_patient` does.

## Base URL

All endpoints are available at:
```
https://irhis-api-czc8f3awe0c4eydv.westeurope-01.azurewebsites.net
```
