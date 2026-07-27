export const SETUP_SHEET_FIELDS: { label: string; name: string; key: string }[] = [
  { label: "Front upper crash bar", name: "frontUpperCrashBar", key: "front_upper_crash_bar" },
  { label: "Front lower crash bar", name: "frontLowerCrashBar", key: "front_lower_crash_bar" },
  { label: "Torsion bar", name: "torsionBar", key: "torsion_bar" },
  { label: "Camber", name: "camber", key: "camber" },
  { label: "Caster", name: "caster", key: "caster" },
  { label: "Toe", name: "toe", key: "toe" },
  { label: "Front track", name: "frontTrack", key: "front_track" },
  { label: "Front wheels", name: "frontWheels", key: "front_wheels" },
  { label: "Ackerman", name: "ackerman", key: "ackerman" },
  { label: "Front ride height", name: "frontRideHeight", key: "front_ride_height" },
  { label: "Sidepods", name: "sidepods", key: "sidepods" },
  { label: "3rd bearing", name: "thirdBearing", key: "third_bearing" },
  { label: "Axle", name: "axle", key: "axle" },
  { label: "Rear ride height", name: "rearRideHeight", key: "rear_ride_height" },
  { label: "Rear bar", name: "rearBar", key: "rear_bar" },
  { label: "Rear wheels", name: "rearWheels", key: "rear_wheels" },
  { label: "Front sprocket", name: "frontSprocket", key: "front_sprocket" },
  { label: "Rear sprocket", name: "rearSprocket", key: "rear_sprocket" },
  { label: "Seat position A", name: "seatPositionA", key: "seat_position_a" },
  { label: "Seat position B", name: "seatPositionB", key: "seat_position_b" },
];

type SheetValues = Record<string, unknown> | null | undefined;

/**
 * Compares two setup sheets field-by-field and describes what changed.
 * Used to auto-detect the change from a submission instead of relying on
 * the driver to write it down themselves.
 */
export function diffSetupSheets(previous: SheetValues, next: SheetValues): string | null {
  if (!next) return null;

  const changes: string[] = [];
  for (const { label, key } of SETUP_SHEET_FIELDS) {
    const before = (previous?.[key] as string | null | undefined) ?? null;
    const after = (next[key] as string | null | undefined) ?? null;
    if (before === after) continue;

    if (!before && after) changes.push(`${label} set to ${after}`);
    else if (before && !after) changes.push(`${label} cleared (was ${before})`);
    else changes.push(`${label}: ${before} → ${after}`);
  }

  if (changes.length === 0) return previous ? null : null;
  return changes.join("; ");
}
