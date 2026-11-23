# Movement analysis pipeline

All movement analysis runs **on the phone**, in TypeScript, with no network calls. Only the resulting metrics are sent to the backend.

| File | Role |
|---|---|
| `frontend/app/services/analysisApi.ts` | Entry point (`createLocalAnalysisApi`), knee and hip metric calculation, repetition counting |
| `frontend/app/analysis/kinematics.ts` | Quaternion maths, knee and hip angle series |
| `frontend/app/analysis/metrics.ts` | Velocities, active-window detection, ROM, asymmetry helpers |
| `frontend/app/analysis/com.ts` | Centre-of-mass segment model (De Leva 1996) |
| `frontend/app/io/zipReader.ts` | Reads Movella DOT CSV exports (ZIP) into the same `Session` structure |
| `frontend/app/services/sessionService.ts` | Turns an analysis result into a session and metrics on the backend |

## 1. Input

The recording screen builds a `Session` directly from the live Bluetooth data: for each body position (tags 1–5), a list of timestamps (seconds on a clock shared by all sensors, see [sensor-limitations.md](sensor-limitations.md#timing-between-sensors)) and orientation quaternions `[w, x, y, z]`. CSV files go through `zipReader.ts` and end up in the same structure.

Required sensors are checked first; any that are missing are listed in `missingSensors` and the metrics that need them are left at 0.

## 2. Knee

For each side (thigh + shank):

1. **Align** the thigh and shank streams in time.
2. **Angle**: rotate the sensor's Y axis (the bone direction) by each sensor's quaternion into the world frame, and take the angle between the two vectors: `knee = acos(v_thigh · v_shank)`.
3. **Baseline**: subtract the mean angle over the first 1 second, so 0° is the starting posture.
4. **Velocity**: central-difference derivative using real time steps (°/s).
5. **Active window**: moving RMS of angular velocity (30-sample window, threshold 5°/s) finds where the movement starts and stops. Rest at the start and end is excluded.
6. **Metrics** over the active window: ROM (max − min), maximum flexion, maximum extension, average absolute velocity, peak velocity, 95th-percentile velocity.
7. **Repetitions**: local maxima of the smoothed angle (~150 ms moving average) that rise at least `max(6°, 25% of ROM)` above the previous valley and are at least 0.6 s apart.

## 3. Hip

For each side (pelvis + thigh):

1. **Align** the pelvis and thigh streams.
2. **Neutral**: average the bone direction of the thigh and of the pelvis over the first 120 samples (~2 s) to get each segment's neutral direction.
3. **Angle** per sample: `hip ≈ (thigh deviation from its neutral) − (pelvis deviation from its neutral)`. Subtracting the pelvis part removes some of the pelvic tilt and sway.
4. **Metrics**: ROM (max − min), maximum flexion (peak above neutral), maximum extension (depth below neutral), and velocities over the **whole recording** (not the active window).
5. **Abduction and rotation**: computed in the pelvis frame's frontal and transverse planes, reported as maximum absolute values.
6. **Repetitions**: not calculated; always 0.

Hip values are not reliable as absolute numbers. See [sensor-limitations.md](sensor-limitations.md).

## 4. Centre of mass

When the pelvis sensor is present, a five-segment model (pelvis, both thighs, both shanks) is built from the sensor orientations using De Leva (1996) proportions:

| Segment | Length (× body height) | Mass (× body mass) | CoM position (from proximal end) |
|---|---|---|---|
| Thigh | 0.245 | 0.100 | 40.9% |
| Shank | 0.246 | 0.0465 | 44.5% |
| Pelvis | 0.146 (width) | 0.142 | centre |

The mass-weighted centre of mass is tracked over time, and the result reports its vertical, mediolateral and anteroposterior amplitude and RMS displacement, in cm. Body height and mass come from the patient's record (`GET /patients/<id>`, height in metres, weight in kg). If either is missing, the request fails, or the value is implausible (height outside 0.5–2.5 m, mass outside 20–300 kg), **1.75 m / 70 kg** is used for that value (`analysis/bodyMeasurements.ts`).

## 5. Asymmetry

`romDifference = |ROM_left − ROM_right|`, for knee and hip separately. If the difference is under 10° the result is `balanced`; otherwise the side with the larger ROM is reported as dominant.

## 6. Quality checks

After each analysis, the ROM and peak velocity values are written to the developer console (`[QC]` logs) for debugging. These checks are **not shown to the user** and do not block saving, so implausible values (for example a knee ROM above 140° or a peak velocity above 500°/s) are stored as they are.

## 7. Saving to the backend

`createSessionFromAnalysisResult()`:

1. Creates a session for the patient and exercise (`POST /patients/<id>/sessions`), including repetitions (taken from the knee) and duration.
2. Posts one metrics row per joint and side (`POST /sessions/<id>/metrics`): knee left/right, hip left/right, and the centre-of-mass displacement.
3. Computes a session score for display: `score = clamp(60 + (average knee ROM / 90) × 35, 0, 100)`. This is a simple heuristic, not a clinical scale.

If the patient or exercise is missing (for example when the recording screen was opened without them), the analysis is shown but not saved.

## Tests

Unit tests in `app/analysis/__tests__/` (kinematics, metrics, full pipeline with a synthetic 5-cycle dataset), `app/io/__tests__/` and `app/services/__tests__/`. No test runner is configured yet; see [development.md](development.md#tests).

## History

Earlier versions of the pipeline had wrapped hip angles (359° jumps), velocities computed with wrong time steps, knee repetitions always at 0 and ROM values that were too low. These were fixed by:
- unwrapping angles
- using central differences with real time steps
- rewriting the repetition counter
- using quaternions directly instead of converting to Euler angles and back
