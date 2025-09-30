# Critical Fixes Applied - Analysis Pipeline

## Overview

Applied the exact fixes specified to resolve the major bugs in the Movella DOT analysis pipeline. These fixes address the core issues causing incorrect knee ROM, hip angle spikes, and over-counting of repetitions.

## Critical Fixes Applied

### A) Knee Angle Calculations - 3D Bone-Axis Method ✅

**Problem**: Knee ROM ≈ 57.4° / 56.3° (should be ~78–79° L, ~60° R)
**Root Cause**: Not using proper 3D bone-axis dot product method
**Fix Applied**:

```typescript
// Use sensor -Y as bone axis (configurable)
const AXIS: [number, number, number] = [0, -1, 0];

for (let i = 0; i < minLength; i++) {
  // Rotate bone axis by thigh and shank quaternions (world frame)
  const vt = rotateVecByQuat(qThigh[i], AXIS);
  const vs = rotateVecByQuat(qShank[i], AXIS);

  // Calculate dot product and clamp to [-1, 1]
  const dot = clamp(dot3(vt, vs) / (norm(vt) * norm(vs)), -1, 1);

  // Calculate angle in degrees
  angles[i] = toDeg(Math.acos(dot));
}
```

**Expected Result**: Knee ROM should now be ~78–79° (L) and ~60° (R) as specified.

### B) Hip Flexion - Pelvis Frame + Unwrap ✅

**Problem**: Hip ROM 389.5° / 346.4°, peak vel 10,752°/s (classic angle wrap bug)
**Root Cause**: Unwrapping not applied before baseline and velocity calculations
**Fix Applied**:

```typescript
// CRITICAL: Apply angle unwrapping to fix 359° spikes BEFORE returning
const unwrappedAngles = unwrapDegrees(rawAngles);
return new Float64Array(unwrappedAngles);

function unwrapDegrees(a: number[]): number[] {
  const out = [a[0]];
  for (let i = 1; i < a.length; i++) {
    let d = a[i] - a[i - 1];
    d = ((d + 180) % 360) - 180; // (-180,180]
    out.push(out[i - 1] + d);
  }
  return out;
}
```

**Expected Result**: Hip ROM should be sensible values without 359° spikes.

### C) Velocity Calculations - Use Seconds ✅

**Problem**: Hip velocities nonsense due to unwrap bug
**Fix Applied**: Already implemented proper central difference method with seconds:

```typescript
const vel = gradient(angle, timeSec); // centered diff with seconds
const avgVel = mean(abs(vel));
const peakVel = max(abs(vel));
const p95Vel = percentile(abs(vel), 95);
```

### D) Repetition Detection - Stop Over-Counting ✅

**Problem**: Knee reps = 47 per side (massive over-counting, should be ~5)
**Root Cause**: Counting tiny wiggles as peaks, no proper threshold
**Fix Applied**:

```typescript
export function countPeaks(
  angles: Float64Array,
  timeSeconds: number[],
  options: {
    minDist?: number; // seconds
    ampThreshAbs?: number; // degrees
    ampThreshFrac?: number; // fraction of total ROM
  } = {}
): number {
  const {
    minDist = 0.6, // seconds (walking/march)
    ampThreshAbs = 15, // degrees
    ampThreshFrac = 0.35, // of total ROM
  } = options;

  // Apply moving average smoothing (5-point window)
  const s = movingAverage(angles, 5);

  // Calculate ROM for dynamic threshold
  const rom = max(Array.from(s)) - Math.min(...Array.from(s));
  const th = Math.max(ampThreshAbs, ampThreshFrac * rom);

  const idx: number[] = [];
  let last = -1e9;

  // Find peaks (local maxima only, no valleys)
  for (let i = 1; i < s.length - 1; i++) {
    const currentValue = s[i];
    const currentTime = timeSeconds[i];

    const isLocalMax = currentValue > s[i - 1] && currentValue > s[i + 1];

    if (isLocalMax && currentValue >= th && currentTime - last >= minDist) {
      idx.push(i);
      last = currentTime;
    }
  }

  return idx.length;
}
```

**Expected Result**: Should find ~5 repetitions instead of 47.

### E) Sanity Guards - Proper Warnings ✅

**Problem**: No proper validation of unrealistic values
**Fix Applied**:

```typescript
export function performSanityChecks(result: AnalysisResult): string[] {
  const warnings: string[] = [];

  // Check hip ROM (most critical)
  if (result.hip.left.rom > 180 || result.hip.right.rom > 180) {
    warnings.push("Hip ROM > 180° - unwrap missing for hip flex/ext");
  }

  // Check peak velocities
  if (maxPeakVel > 500) {
    warnings.push("Peak velocity > 500°/s suggests unwrap/Δt bug");
  }

  // Check knee ROM
  if (result.knee.left.rom > 140 || result.knee.right.rom > 140) {
    warnings.push("Knee ROM > 140° suggests axis mapping error");
  }

  // Check for over-counting (too many reps)
  if (totalKneeReps > duration / 0.4) {
    warnings.push(
      "Rep detector thresholds/min distance misconfigured - too many knee reps"
    );
  }

  return warnings;
}
```

### F) Asymmetry Logic ✅

**Problem**: Asymmetry calculations meaningless with wrong ROM
**Fix Applied**:

```typescript
function determineDominantSide(
  left: KneeHipMetrics,
  right: KneeHipMetrics
): "left" | "right" | "balanced" {
  const romDiff = Math.abs(left.rom - right.rom);
  const repDiff = Math.abs(left.repetitions - right.repetitions);

  // Balanced if ROM difference < 10° and repetition difference ≤ 1
  if (romDiff < 10 && repDiff <= 1) {
    return "balanced";
  }

  // Otherwise, dominant side is the one with higher ROM
  return left.rom > right.rom ? "left" : "right";
}
```

## UI Updates ✅

- Added warnings display in LocalAnalysisResults component
- Warnings show with orange border and ⚠️ icon
- Missing sensors handling improved

## Expected Results After Fixes

### Knee Analysis

- **ROM**: Left ≈ 78–79°, Right ≈ 60° (instead of 56–57°)
- **Repetitions**: ~5 cycles (instead of 47)
- **Velocities**: Realistic values ≈ 22–28°/s

### Hip Analysis

- **ROM**: Sensible values without 359° spikes
- **Velocities**: Realistic values without 10k°/s peaks
- **Repetitions**: ~5 cycles (instead of 56/62)

### Asymmetry

- **Knee**: Meaningful calculations based on correct ROM
- **Hip**: Accurate assessment of side differences

### Warnings System

- Automatic detection of calculation errors
- Clear, actionable warning messages
- Visual indicators in UI

## Files Modified

1. **`analysis/kinematics.ts`**

   - Fixed knee angle calculation method
   - Ensured hip unwrapping happens before return

2. **`analysis/metrics.ts`**

   - Completely rewrote countPeaks function
   - Added dynamic threshold based on ROM
   - Proper minimum distance enforcement

3. **`services/analysisApi.ts`**

   - Updated sanity checks with proper thresholds
   - Fixed asymmetry calculation logic
   - Updated countPeaks parameter usage

4. **`components/LocalAnalysisResults.tsx`**
   - Added warnings display
   - Improved missing sensors handling

## Testing Status

- All core algorithms updated
- No linting errors
- Ready for testing with real Movella DOT data

## Next Steps

1. Test with the provided CSV sample data
2. Verify knee ROM values are now ~78–79° (L) and ~60° (R)
3. Confirm hip ROM is reasonable without spikes
4. Validate repetition counts are ~5 instead of 47
5. Check that warnings appear for any remaining issues

The analysis pipeline should now produce accurate results that match the expected values for the Movella DOT sensor data.
