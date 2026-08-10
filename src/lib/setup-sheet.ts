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

// Groups the flat field list into the sections the setup sheet UI renders
// as separate cards (Front End / Rear End / Chassis / Drivetrain). Every
// key in SETUP_SHEET_FIELDS appears in exactly one group.
export const SETUP_SHEET_GROUPS: { title: string; keys: string[] }[] = [
  {
    title: "Front end",
    keys: [
      "front_upper_crash_bar",
      "front_lower_crash_bar",
      "camber",
      "caster",
      "toe",
      "front_track",
      "front_ride_height",
      "ackerman",
    ],
  },
  {
    title: "Rear end",
    keys: ["torsion_bar", "axle", "rear_ride_height", "rear_bar", "third_bearing"],
  },
  {
    title: "Chassis",
    keys: ["sidepods", "seat_position_a", "seat_position_b"],
  },
  {
    title: "Drivetrain",
    keys: ["front_sprocket", "rear_sprocket", "front_wheels", "rear_wheels"],
  },
];

// The subset of fields called out on the kart diagram, paired with roughly
// where they live on the kart (front vs rear) so the diagram can lay them
// out left/right.
export const KART_DIAGRAM_HOTSPOTS: { side: "front" | "rear"; key: string }[] = [
  { side: "front", key: "camber" },
  { side: "front", key: "toe" },
  { side: "front", key: "caster" },
  { side: "front", key: "front_ride_height" },
  { side: "rear", key: "axle" },
  { side: "rear", key: "rear_bar" },
  { side: "rear", key: "third_bearing" },
  { side: "rear", key: "rear_ride_height" },
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
