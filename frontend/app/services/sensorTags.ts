import { DeviceTag } from "./movellaBleService";

/**
 * Names stored on each Movella DOT sensor ("DOT tag", max 16 characters) that
 * identify which kit it belongs to and where it is worn:
 *
 *   "<kit>-<position>"   e.g. "K01-RTHIGH", or with a longer kit name "K01-XSens01-RT"
 *
 * Writing the position onto the sensor itself means any phone recognises a
 * registered sensor automatically, across app reinstalls and on iOS (where
 * sensor IDs differ per phone). The kit name keeps phones from connecting
 * to another kit's sensors when several kits are in Bluetooth range.
 *
 * Positions use a long code when it fits in 16 characters, otherwise a 2-letter
 * code. Both forms are recognised when reading.
 */

const MAX_TAG_LENGTH = 16;
/** Longest kit name that still fits with "-" and a 2-letter position code. */
export const MAX_KIT_ID_LENGTH = MAX_TAG_LENGTH - 3; // 13

const LONG_CODES: Record<DeviceTag, string> = {
  [DeviceTag.RIGHT_THIGH]: "RTHIGH",
  [DeviceTag.RIGHT_SHANK]: "RSHANK",
  [DeviceTag.LEFT_THIGH]: "LTHIGH",
  [DeviceTag.LEFT_SHANK]: "LSHANK",
  [DeviceTag.PELVIS]: "PELVIS",
};

const SHORT_CODES: Record<DeviceTag, string> = {
  [DeviceTag.RIGHT_THIGH]: "RT",
  [DeviceTag.RIGHT_SHANK]: "RS",
  [DeviceTag.LEFT_THIGH]: "LT",
  [DeviceTag.LEFT_SHANK]: "LS",
  [DeviceTag.PELVIS]: "PV",
};

const CODE_TO_POSITION: Record<string, DeviceTag> = {};
for (const codes of [LONG_CODES, SHORT_CODES]) {
  for (const [tag, code] of Object.entries(codes)) {
    CODE_TO_POSITION[code] = Number(tag) as DeviceTag;
  }
}

/**
 * Kit names: 1-13 characters, letters/digits/"-", starting with a letter or digit
 * and not ending with "-". E.g. "K01", "K01-XSens01".
 */
const KIT_PATTERN = new RegExp(`^[A-Za-z0-9](?:[A-Za-z0-9-]{0,${MAX_KIT_ID_LENGTH - 2}}[A-Za-z0-9])?$`);

export interface ParsedSensorTag {
  kitId: string;
  position: DeviceTag;
}

/**
 * Validate and tidy a kit name. A bare number ("1", "k1", "K001") becomes "K01"
 * for convenience; anything else is kept as typed (case preserved) if valid.
 */
export function normalizeKitId(input: string): string | null {
  const value = String(input || "").trim();
  const numeric = value.match(/^[Kk]?(\d{1,3})$/);
  if (numeric) {
    const number = parseInt(numeric[1], 10);
    return number >= 1 ? `K${String(number).padStart(2, "0")}` : null;
  }
  return KIT_PATTERN.test(value) ? value : null;
}

/** Kit names are compared without regard to upper/lower case. */
export function sameKit(a?: string | null, b?: string | null): boolean {
  return !!a && !!b && a.toUpperCase() === b.toUpperCase();
}

/**
 * Build the name to store on a sensor:
 *   buildSensorTag("K01", RIGHT_THIGH)         → "K01-RTHIGH"
 *   buildSensorTag("K01-XSens01", RIGHT_THIGH) → "K01-XSens01-RT"
 */
export function buildSensorTag(kitId: string, position: DeviceTag): string {
  const kit = normalizeKitId(kitId);
  if (!kit) {
    throw new Error(`Invalid kit name "${kitId}"`);
  }
  const long = LONG_CODES[position];
  if (!long) {
    throw new Error(`Unknown body position ${position}`);
  }
  const withLong = `${kit}-${long}`;
  return withLong.length <= MAX_TAG_LENGTH ? withLong : `${kit}-${SHORT_CODES[position]}`;
}

/** Read a sensor name; returns null when the sensor was not registered by IRHIS. */
export function parseSensorTag(tag?: string | null): ParsedSensorTag | null {
  const value = String(tag || "").trim();
  const dash = value.lastIndexOf("-");
  if (dash <= 0) return null;
  const kitId = value.slice(0, dash);
  const position = CODE_TO_POSITION[value.slice(dash + 1).toUpperCase()];
  if (position === undefined || !KIT_PATTERN.test(kitId)) return null;
  return { kitId, position };
}
