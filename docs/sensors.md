# Movella DOT sensors

IRHIS uses five **Movella DOT** inertial sensors (formerly Xsens DOT). Each contains an accelerometer, gyroscope and magnetometer, and runs Movella's sensor-fusion algorithm on board to output its orientation.

For what the data can and cannot be trusted for, read [sensor-limitations.md](sensor-limitations.md).

## Body positions

Each sensor is assigned a body position (a *device tag*) in the app's **Sensors** tab. The analysis relies on these numbers.

| Tag | Position | Used for |
|---|---|---|
| 1 | Right thigh | Right knee, right hip |
| 2 | Right shank (lower leg) | Right knee |
| 3 | Left thigh | Left knee, left hip |
| 4 | Left shank (lower leg) | Left knee |
| 5 | Pelvis | Both hips, centre of mass |

- **Knee** angle = thigh + shank of the same side (tags 1+2 right, 3+4 left).
- **Hip** angle = thigh relative to pelvis (tag 1 or 3 with tag 5).
- If a side is missing its sensors, that side's metrics are reported as 0 and the sensor is listed under *missing sensors* in the result.

Tags set in the app are kept in memory for the session only; they are not written to the sensor. Each sensor also has a hardware *DOT tag* (its name stored on the device), shown in the sensor card to help match physical units to positions. Labelling the sensors 1–5 with stickers avoids swaps.

### Placement

| Tag | Where | Facing |
|---|---|---|
| 1, 3 (thighs) | Outer side of the thigh, **slightly above the knee** (over the lateral femoral condyle) | Outwards (lateral) |
| 2, 4 (shanks) | Outer side of the lower leg, **slightly above the ankle** (over the lateral malleolus) | Outwards (lateral) |
| 5 (pelvis) | Centre of the lower back, **just above the buttocks** (over the sacrum, L5 region) | Backwards |

Beyond the position itself, the analysis needs:

1. Each sensor **strapped firmly** so it cannot slide or rotate during the exercise.
2. Its long axis **aligned with the bone**, in the same orientation on every leg sensor (the analysis treats the sensor's Y axis as the bone direction).
3. The patient standing **still in a neutral upright position for about 2 seconds** at the start of each recording (see *Baseline* below).

## Connecting (in the app)

1. Open the **Sensors** tab and tap **Start Scanning**. Scanning runs for 10 seconds and lists devices whose name contains *Movella*, *Xsens* or *DOT*, or whose address starts with `D4:22:CD` (Movella's range).
2. Tap **Connect** on each sensor. The card turns green when connected and shows the battery level.
3. Assign a body position to each connected sensor.
4. The status card shows **Sensors ready** when connected sensors cover all five positions.

**Rescan Sensors** disconnects everything, clears the list and scans again. While an exercise is being recorded, disconnecting, rescanning and changing positions are blocked.

Testing mode on the recording screen allows recording with a single sensor; it is meant for development only.

## What the app streams

| Setting | Value |
|---|---|
| Measurement mode | **Extended (Quaternion)**, payload mode 2 (36-byte packets) |
| Output rate | Sensor default, **60 Hz** (the app does not change it) |
| Fields per sample | Timestamp (µs), orientation quaternion (w, x, y, z), free acceleration x/y/z (m/s², gravity removed), status flags |
| Derived in the app | Euler angles (ZYX) from the quaternion, for display and CSV export only |

The analysis uses the **quaternions directly**. Earlier versions converted to Euler angles and back, which lost precision; that path is only kept as a fallback for old CSV files.

Measurements are started on the sensors one after another (with a 150 ms pause between sensors on Android, where the Bluetooth stack cannot handle parallel requests). Each sensor's timestamps are then counted from its own first sample. See [sensor-limitations.md](sensor-limitations.md#timing-between-sensors) for what this means.

### Status flags

The status field reports clipping, i.e. when the accelerometer or gyroscope hits its range limit on an axis (for example `0x0012` = accelerometer and gyroscope out of range on Y). Clipped samples are not currently filtered out by the analysis.

## CSV format (Movella DOT export)

The app can still analyse CSV files exported by the Movella DOT app, and it can show a CSV preview of a live recording in the same format (**Show CSV** on the recording screen). Columns:

| Column | Meaning | Unit |
|---|---|---|
| `PacketCounter` | Sequential sample index; gaps mean dropped packets | – |
| `SampleTimeFine` | Sensor timestamp | µs |
| `Euler_X/Y/Z` | Orientation as Euler angles | ° |
| `FreeAcc_X/Y/Z` | Acceleration without gravity, sensor frame | m/s² |
| `Status` | Clipping flags | – |

The header of each file contains metadata, including `DeviceTag` (1–5, the body position), firmware version, output rate, filter profile and measurement mode. Five sample files are in `frontend/csv-example/`. The ZIP upload option is currently hidden in the app.

## Baseline (start-of-recording calibration)

The app does not run an explicit sensor-to-segment calibration. Instead, every recording is referenced to its **first seconds**, when the patient is expected to stand still:

| Joint | Reference |
|---|---|
| Knee | Mean knee angle over the **first 1 s** is subtracted from the whole series |
| Hip | Mean thigh and pelvis directions over the **first 120 samples (~2 s at 60 Hz)** define neutral |

If the patient moves during these first seconds, every angle in that recording is shifted.

Movella DOT supports a **heading reset** (aligning the heading of all sensors during a measurement, see section 3.6 of the [BLE specification](reference/movella-dot-ble-service-spec.md)). The app does not use it yet; it is a candidate improvement for hip accuracy.

## Practical tips

- Charge all sensors before each session; check battery levels in the Sensors tab.
- Keep away from strong magnetic fields and large metal objects (they affect the magnetometer and therefore the heading).
- Re-strap any sensor that moved and record again; the baseline cannot correct a sensor that slides during the exercise.

## Reference

- [Movella DOT BLE Service Specification](reference/movella-dot-ble-service-spec.md): the vendor's full BLE protocol (services, characteristics, payload formats).
- Code: `frontend/app/services/movellaBleService.ts` (BLE), `frontend/app/context/SensorContext.tsx` (connection state), `frontend/app/services/bleDataConverter.ts` (CSV export).
