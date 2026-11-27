import type { Session, SensorStream } from "../io/zipReader";
import { DeviceTag, FusionMeasurementData } from "../services/movellaBleService";

/**
 * Build a Session object directly from BLE exercise data.
 * Uses the original quaternion stored on each FusionMeasurementData packet,
 * falling back to Euler conversion only if the quaternion field is absent.
 * This avoids the quat → Euler → quat round-trip that was done via ZIP/CSV.
 */
export function buildSessionFromBleData(
  exerciseData: Map<string, FusionMeasurementData[]>,
  deviceTagMap: Map<string, DeviceTag>,
  _startTime: Date,
  /** Per-sensor times (s) on a shared clock (clockSync.ts); falls back to each sensor's own clock. */
  alignedTimes?: Map<string, number[]>
): Session {
  const streams: Record<number, SensorStream> = {};

  for (const [sensorId, data] of Array.from(exerciseData.entries())) {
    const tagEnum = deviceTagMap.get(sensorId);
    if (tagEnum === undefined || data.length === 0) continue;

    const tag = typeof tagEnum === "number" ? tagEnum : Number(tagEnum);
    const firstTime = data[0].SampleTimeFine;
    const shared = alignedTimes?.get(sensorId);
    const useShared = !!shared && shared.length === data.length;

    const quats: [number, number, number, number][] = [];
    const times: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const sample = data[i];
      // Shared clock when available, else seconds from this sensor's first sample
      times.push(useShared ? shared![i] : (sample.SampleTimeFine - firstTime) / 1e6);

      if (sample.quaternion) {
        // Use original BLE quaternion — no conversion needed
        const q = sample.quaternion;
        quats.push([q.w, q.x, q.y, q.z]);
      } else {
        // Fallback: convert from Euler (legacy path)
        const ex = (sample.Euler_X * Math.PI) / 180;
        const ey = (sample.Euler_Y * Math.PI) / 180;
        const ez = (sample.Euler_Z * Math.PI) / 180;
        const cy = Math.cos(ez * 0.5), sy = Math.sin(ez * 0.5);
        const cp = Math.cos(ey * 0.5), sp = Math.sin(ey * 0.5);
        const cr = Math.cos(ex * 0.5), sr = Math.sin(ex * 0.5);
        quats.push([
          cr * cp * cy + sr * sp * sy,
          sr * cp * cy - cr * sp * sy,
          cr * sp * cy + sr * cp * sy,
          cr * cp * sy - sr * sp * cy,
        ]);
      }
    }

    streams[tag] = {
      tag: tag as 1 | 2 | 3 | 4 | 5,
      t: times,
      ex: [], ey: [], ez: [], // Euler not needed downstream
      quat: quats,
    };
  }

  return { streams };
}
