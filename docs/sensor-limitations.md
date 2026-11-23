# Sensor limitations and metric reliability

This page explains which IRHIS metrics can be trusted, which cannot, and why. It brings together the team's earlier analyses of Movella DOT limitations (previously four separate documents in Portuguese).

**Summary**

- **Knee** metrics are the core, usable output. They behave consistently and give physiologically plausible values.
- **Hip** metrics are **not reliable as absolute values**. Only relative measures (left/right asymmetry, change over time for the same patient) should be used.
- **No metric has yet been validated against a reference system** (goniometer, optical motion capture). Until that is done, all values should be presented as *estimates* and not used alone for clinical decisions.

## Why the knee works

| | Knee | Hip |
|---|---|---|
| Joint type | Hinge: essentially 1 degree of freedom (flexion/extension) | Ball-and-socket: 3 degrees of freedom (flexion/extension, abduction/adduction, rotation) |
| Reference segment | Thigh, relatively stable during knee exercises | Pelvis, which also moves (tilt, trunk sway) |
| Calculation | Angle between two bone axes | Thigh motion relative to a moving pelvis, in three planes |
| Effect of errors | Mostly in one plane | Spread across three planes and amplified |

The knee angle is the angle between the thigh and shank bone axes, so small misalignments of the sensors mostly cancel out after the start-of-recording baseline is subtracted.

## Why the hip is hard

1. **The reference moves.** Hip angles are measured relative to the pelvis, but the pelvis tilts and rotates during exercises. Any pelvis error goes straight into the hip angle.
2. **Drift.** Orientation from IMUs drifts over time, especially the heading (rotation around the vertical), which depends on the magnetometer and is disturbed by metal and electronics nearby. Drift affects all three hip planes at once.
3. **Sensor-to-segment alignment.** The app assumes each sensor's axis lines up with the bone. Small strapping errors, which are easy to make in a clinic or at home, cause larger errors at the hip than at the knee.
4. **Soft tissue.** The pelvis sensor sits on soft tissue over the sacrum and moves relative to the bone, especially in heavier patients.

These are physical limits of the sensing approach, not bugs: several calculation methods were tried (pelvis frame, world frame, angle unwrapping, automatic axis selection, different baselines) and none removed the inconsistencies.

### Evidence

Results from an **earlier version** of the hip calculation, for an exercise where about 90° of hip flexion was expected:

| Metric | Expected | Left | Right |
|---|---|---|---|
| ROM | ~90° | 119.7° | 104.8° |
| Max flexion | ~90° | 28.6° | 39.9° |
| Peak velocity | < 500°/s | 260.8°/s | **4720°/s** (physically impossible) |

The hip method has since been changed (thigh and pelvis displacement from a calibrated neutral, see [analysis-pipeline.md](analysis-pipeline.md#3-hip)), but it has **not been re-validated**, so these limitations should still be assumed.

## Which hip metrics can be used

| Metric | Use? | Reason |
|---|---|---|
| Left/right ROM **asymmetry** | Yes, with care | Systematic errors that affect both sides equally cancel out in the difference |
| **Movement detected** (yes/no) | Yes | Robust to systematic errors |
| **Change over time** for the same patient (increased / decreased / stable) | Yes, with care | Valid only if sensor placement is consistent between sessions |
| Absolute ROM | No | Observed errors of 15–30% |
| Max flexion / extension | No | Large errors in earlier testing |
| Velocities (average, peak, P95) | No | Derivatives amplify angle errors; also computed over the whole recording, including rest |
| Abduction, rotation | No | Calculated but never validated |
| Repetitions | Not available | Always 0 for the hip; repetitions come from the knee |

A dedicated set of "reliable hip metrics" (asymmetry above 10°, movement above 20° ROM, change direction between sessions) was specified earlier but has **not been implemented** in the current code. The app still computes and stores absolute hip values. Clinician-facing screens should either hide them or label them clearly as unvalidated.

## Other limitations (all joints)

### Baseline depends on the patient standing still

Angles are referenced to the first 1–2 seconds of each recording (see [sensors.md](sensors.md#baseline-start-of-recording-calibration)). If the patient moves during that time, the whole recording is shifted. Nothing in the app currently checks this or warns the user.

### Timing between sensors

The app starts the sensors one after another (150 ms apart on Android), and each sensor has its own clock. Since November 2026 the recording screen puts every sensor on the phone's clock (`app/analysis/clockSync.ts`): for each sensor it tracks the smallest gap between the sensor's timestamp and the moment the phone receives the packet, which is the clock difference plus the fastest Bluetooth delivery time. The remaining error between sensors is the difference in that fastest delivery time, typically 10 to 30 ms (one Bluetooth connection interval), instead of up to about half a second before. The 32-bit sensor clock wrap (about 71 minutes) and a sensor restarting mid-recording are handled.

Movella's own synchronisation (all sensors on one sensor clock) is not used: it needs every sensor to be disconnected and reconnected around a 14-second sync period, and disconnecting is the step that is unreliable on Android. ZIP/CSV uploads still use each sensor's own clock.

### Drift during long recordings

The baseline is only computed at the start. Recordings of more than a few minutes will accumulate drift that is not corrected.

### Clipping

Fast movements can exceed the accelerometer or gyroscope range. The sensors flag this in the status field, but the analysis does not exclude clipped samples.

### Body model

Centre-of-mass estimates use the patient's recorded height and weight, falling back to 1.75 m and 70 kg when they are missing or implausible. At the time of writing no trial patient has height and weight recorded, so the defaults are used for everyone. The model also uses standard anthropometric proportions (De Leva 1996). Centre-of-mass amplitudes are therefore approximate.

## Recommendations

1. Present the **knee** as the validated core of the system.
2. For the **hip**, show only asymmetry and trends, or label absolute values clearly as estimates.
3. Run a **validation study** against a goniometer or optical motion capture before making accuracy claims.
4. Improve robustness: check that the patient is still during the baseline, synchronise sensors, use the Movella heading reset, and record each patient's height and weight so the centre-of-mass model stops relying on defaults.
5. If accurate hip kinematics are required, consider complementing the IMUs with a camera-based or optical system.
