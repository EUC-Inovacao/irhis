import { DeviceTag } from "./movellaBleService";

/**
 * Names stored on each Movella DOT sensor ("DOT tag", max 16 characters) that
 * identify which kit it belongs to and where it is worn, e.g. "K01-RTHIGH".
 *
 * Writing the position onto the sensor itself means any phone recognises a
 * registered sensor automatically, across app reinstalls and on iOS (where
 * sensor IDs differ per phone). The kit number keeps phones from connecting
 * to another kit's sensors when several kits are in Bluetooth range.
 */

const POSITION_CODES: Record<DeviceTag, string> = {
  [DeviceTag.RIGHT_THIGH]: "RTHIGH",
  [DeviceTag.RIGHT_SHANK]: "RSHANK",
  [DeviceTag.LEFT_THIGH]: "LTHIGH",
  [DeviceTag.LEFT_SHANK]: "LSHANK",
  [DeviceTag.PELVIS]: "PELVIS",
};

const CODE_TO_POSITION: Record<string, DeviceTag> = Object.fromEntries(
  Object.entries(POSITION_CODES).map(([tag, code]) => [code, Number(tag) as DeviceTag])
);

/** Kit identifiers are "K" followed by 2-3 digits, e.g. "K01". */
const KIT_PATTERN = /^K\d{2,3}$/;
const TAG_PATTERN = /^(K\d{2,3})-(RTHIGH|RSHANK|LTHIGH|LSHANK|PELVIS)$/;

export interface ParsedSensorTag {
  kitId: string;
  position: DeviceTag;
}

/** Normalise user input like "1", "k1" or "K001" to a kit id like "K01". */
export function normalizeKitId(input: string): string | null {
  const match = String(input || "").trim().toUpperCase().match(/^K?(\d{1,3})$/);
  if (!match) return null;
  const number = parseInt(match[1], 10);
  if (!Number.isFinite(number) || number < 1) return null;
  return `K${String(number).padStart(2, "0")}`;
}

/** Build the name to store on a sensor, e.g. buildSensorTag("K01", RIGHT_THIGH) → "K01-RTHIGH". */
export function buildSensorTag(kitId: string, position: DeviceTag): string {
  const kit = normalizeKitId(kitId);
  if (!kit || !KIT_PATTERN.test(kit)) {
    throw new Error(`Invalid kit id "${kitId}"`);
  }
  const code = POSITION_CODES[position];
  if (!code) {
    throw new Error(`Unknown body position ${position}`);
  }
  return `${kit}-${code}`;
}

/** Read a sensor name; returns null when the sensor was not registered by IRHIS. */
export function parseSensorTag(tag?: string | null): ParsedSensorTag | null {
  const match = String(tag || "").trim().toUpperCase().match(TAG_PATTERN);
  if (!match) return null;
  return { kitId: match[1], position: CODE_TO_POSITION[match[2]] };
}
