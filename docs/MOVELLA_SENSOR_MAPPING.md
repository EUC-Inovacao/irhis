## Movella DOT – Sensor mapping and knee-side separation

### Context

- Data files exported from Movella DOT Fusion Mode provide per-sensor CSV logs with the following headers: `PacketCounter, SampleTimeFine, Euler_X, Euler_Y, Euler_Z, FreeAcc_X, FreeAcc_Y, FreeAcc_Z, Status`.
- At the top of each CSV, the line `DeviceTag: <n>` identifies the physical sensor unit. The export format is fixed by the firmware; we cannot add fields such as side/segment in the payload.

### Standard placement used in our captures

Based on the current placement protocol, interpret `DeviceTag` as follows:

- Lateral view – sagittal plane:

  - Sensor 1 → Right thigh (above knee – above lateral femur condyle)
  - Sensor 2 → Right lower leg (peroneal malleolus)
  - Sensor 3 → Left thigh (above knee – above lateral femur condyle)
  - Sensor 4 → Left lower leg (peroneal malleolus)

- Posterior view – frontal plane:
  - Sensor 5 → Pelvis (L5/sacrum region)

### Practical rules for analysis

1. Parse the sensor side/segment from `DeviceTag`:

   - 1 → side: right, segment: thigh
   - 2 → side: right, segment: shank
   - 3 → side: left, segment: thigh
   - 4 → side: left, segment: shank
   - 5 → segment: pelvis (optional usage)

2. Knee angle per side:

   - Left knee angle: combine segment orientations from DeviceTag 3 (left thigh) and DeviceTag 4 (left shank).
   - Right knee angle: combine segment orientations from DeviceTag 1 (right thigh) and DeviceTag 2 (right shank).

3. Metrics to compute per knee:

   - Joint angle time series, ROM (min/max/average), repetition counts (by peak/valley rules per exercise), angular velocity, cadence if needed.
   - Optional symmetry/asymmetry metrics between left and right (e.g., ROM difference, time-to-peak differences).

4. Time alignment:

   - Use `SampleTimeFine` to align frames across sensors. `PacketCounter` is monotonic and helpful to detect drops; prefer `SampleTimeFine` for synchronization.

5. Orientation math:
   - Prefer quaternions if available; otherwise compute from `Euler_X/Y/Z` (noting potential gimbal lock). Our code currently supports both by converting Euler→Quaternion and then computing the 3D angle between segment vectors.

### Integration guidance (codebase)

- Frontend parser should read each CSV, capture `DeviceTag` from the header, and route the time series to buckets:

  - `left.thigh` ← tag 3, `left.shank` ← tag 4
  - `right.thigh` ← tag 1, `right.shank` ← tag 2
  - `pelvis` ← tag 5 (if present)

- Knee calculations should be executed per side by pairing thigh/shank within the same side, instead of relying on file order.

- The UI should present outputs in two sections: Left Knee and Right Knee, plus asymmetry when both are available.

### Operational safeguards

- Validate that required sensors are present before computing per-knee metrics:

  - Left knee requires tags 3 and 4; Right knee requires tags 1 and 2.
  - If only one side is available, compute and display that side and mark the other as missing.

- If future sessions change the placement, ensure an explicit mapping file (e.g., `sensors_map.csv` with `DeviceTag,Segment,Side`) is included in the ZIP, or add a short UI mapping step post‑upload.

### Column reference (for quick lookup)

- `PacketCounter`: sequential sample index (monotonic)
- `SampleTimeFine`: high‑resolution timestamp since start (for sync)
- `Euler_X/Y/Z`: orientation angles in degrees (Fusion Mode sequence)
- `FreeAcc_X/Y/Z`: linear acceleration (gravity removed), sensor frame
- `Status`: quality/flags for the sample

### Next steps (recommended)

- Implement a mapping function that inspects `DeviceTag` and returns `{ side, segment }` and routes data accordingly.
- Update the movement analysis service to compute and return per‑knee outputs:
  - `jointAngles: { left: number[], right: number[] }`
  - `metrics: { left: {...}, right: {...}, asymmetry: {...} }`
- Extend charts and reports to present Left vs Right explicitly.
