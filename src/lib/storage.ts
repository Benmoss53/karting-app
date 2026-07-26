// Which Supabase Storage bucket each telemetry_files.file_type lives in.
export const BUCKET_BY_TYPE: Record<string, string> = {
  mychron: "telemetry",
  video: "videos",
  other: "telemetry",
};
