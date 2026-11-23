# Movella DOT sensors

IRHIS uses five **Movella DOT** inertial sensors (formerly Xsens DOT). Each contains an accelerometer, gyroscope and magnetometer, and runs Movella's sensor-fusion algorithm on board to output its orientation.

For what the data can and cannot be trusted for, read [sensor-limitations.md](sensor-limitations.md).

## Body positions

Each sensor is assigned a body position (a *device tag*) in the app's **Sensors** tab. The analysis relies on these numbers.

| Tag | Segment measured | Label in the app (EN / PT) | Used for |
|---|---|---|---|
| 1 | Right thigh | Right knee / Joelho direito | Right knee, right hip |
| 2 | Right shank (lower leg) | Right ankle / Tornozelo direito | Right knee |
| 3 | Left thigh | Left knee / Joelho esquerdo | Left knee, left hip |
| 4 | Left shank (lower leg) | Left ankle / Tornozelo esquerdo | Left knee |
| 5 | Pelvis | Lower back / Fundo das costas | Both hips, centre of mass |

The app labels each sensor by **where it is placed** (just above the knee, just above the ankle, lower back), because that is what patients and clinicians need when putting the sensors on. The analysis and its results keep the anatomical segment names. Right and left are always the patient's.

- **Knee** angle = thigh + shank of the same side (tags 1+2 right, 3+4 left).
- **Hip** angle = thigh relative to pelvis (tag 1 or 3 with tag 5).
- If a side is missing its sensors, that side's metrics are reported as 0 and the sensor is listed under *missing sensors* in the result.

### Registering a kit (once per kit)

Each set of 5 sensors is a **kit** with a name: a number like `K01`, or something longer like `K01-XSens01` (up to 13 letters, digits or `-`; upper/lower case does not matter). A clinician registers it once, from **Sensors → Register kit** (doctor accounts only):

1. Connect all 5 sensors.
2. Tap **Blink** on a sensor: its LED flashes for about 10 seconds, so you know which physical unit it is.
3. Choose where it is worn. The app stores the name `<kit>-<position>` on the sensor itself (e.g. `K01-RTHIGH`, or `K01-XSens01-RT` for a longer kit name) and reads it back to confirm.

The name is stored in the sensor's "device tag" (max 16 characters, kept across power cycles). From then on, whenever a sensor of this phone's kit connects, the app assigns its position **automatically**. This works on any phone, survives app reinstalls, and works on iOS, where sensor IDs differ per phone. The phone's kit name is saved on the phone (default `K01`); sensors registered to another kit are not assigned.

A sensor name holds at most 16 characters, so the position uses its long code when it fits and its 2-letter code otherwise. Both are recognised when reading.

| Position | Long code | Short code |
|---|---|---|
| Right thigh | `RTHIGH` | `RT` |
| Right shank | `RSHANK` | `RS` |
| Left thigh | `LTHIGH` | `LT` |
| Left shank | `LSHANK` | `LS` |
| Pelvis | `PELVIS` | `PV` |

Unregistered sensors (factory name "Movella DOT") can still be assigned by hand in the Sensors tab; that assignment only lasts until the app closes. Code: `services/sensorTags.ts`, `screens/RegisterKitScreen.tsx`.

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

### Automatic (registered kit)

When the **Sensors** tab or the recording screen opens and the sensors are not ready, the app connects the phone's kit by itself (the **Connect kit** button does the same):

1. It scans for up to 30 seconds.
2. A sensor belongs to the kit when its advertised name, the name read from it, or the phone's saved list of kit sensors says `<kit>-<position>` with this phone's kit. The saved list (`irhis.kitSensors` on the phone) is filled when a sensor is registered or connects with a kit name; it also covers iOS, which can keep showing a sensor's old name.
3. Kit sensors are connected one at a time, skipping positions already covered, and get their position automatically. The scan stops once all five positions are covered.

**Dropped sensors.** If a sensor's link drops without the app asking (switched off, out of range, battery), the app retries after 1, 3, 6, 10 and 15 seconds, then keeps scanning for it. The card shows *Reconnecting…*. If the sensor was streaming during a recording, streaming restarts when it reconnects; the recording has a gap for that sensor while it was away.

**Manual disconnects** are respected: a sensor disconnected by hand is not reconnected or auto-connected until it is connected by hand again, or **Connect kit** / **Rescan Sensors** is used.

### Manual

1. Open the **Sensors** tab and tap **Start Scanning**. Scanning runs for 10 seconds and lists devices whose name contains *Movella*, *Xsens* or *DOT*, is a registered sensor name, or whose address starts with `D4:22:CD` (Movella's range).
2. Tap **Connect** on each sensor. The card turns green when connected and shows the battery level.
3. Assign a body position to each connected sensor (registered kit sensors get theirs automatically).
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
