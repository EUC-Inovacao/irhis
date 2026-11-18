/**
 * Body measurements used by the centre-of-mass model.
 *
 * The patient's own height and weight are used when they are recorded and
 * plausible; otherwise these population defaults are used as a fallback.
 */

export const DEFAULT_BODY_HEIGHT_M = 1.75;
export const DEFAULT_BODY_MASS_KG = 70;

// Plausible adult ranges; values outside are treated as missing or mis-entered
const HEIGHT_RANGE_M: [number, number] = [0.5, 2.5];
const MASS_RANGE_KG: [number, number] = [20, 300];

export interface BodyMeasurements {
  bodyHeight_m: number;
  bodyMass_kg: number;
  /** True when the default height was used instead of the patient's */
  heightIsDefault: boolean;
  /** True when the default mass was used instead of the patient's */
  massIsDefault: boolean;
}

const inRange = (value: unknown, [min, max]: [number, number]): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

/**
 * Pick the patient's height (m) and weight (kg) when available and plausible,
 * falling back to the defaults for whichever is missing.
 */
export function resolveBodyMeasurements(
  details?: { height?: number | null; weight?: number | null } | null
): BodyMeasurements {
  const height = details?.height;
  const weight = details?.weight;
  const heightOk = inRange(height, HEIGHT_RANGE_M);
  const massOk = inRange(weight, MASS_RANGE_KG);
  return {
    bodyHeight_m: heightOk ? height : DEFAULT_BODY_HEIGHT_M,
    bodyMass_kg: massOk ? weight : DEFAULT_BODY_MASS_KG,
    heightIsDefault: !heightOk,
    massIsDefault: !massOk,
  };
}
