import { z } from "zod";
export const LIMITS = {
  fileBytes: 32 * 1024 * 1024,
  archiveBytes: 256 * 1024 * 1024,
  expandedBytes: 512 * 1024 * 1024,
  entries: 5000,
  ratio: 200,
  depth: 12,
  batch: 25,
} as const;
export const categorySchema = z.enum([
  "running",
  "trail",
  "cycling",
  "swimming",
  "unsupported",
  "unknown",
]);
export type Category = z.infer<typeof categorySchema>;
export const parsedSchema = z.object({
  title: z.string().max(160),
  original_sport: z.string().max(120),
  category: categorySchema,
  started_at_utc: z.iso.datetime().nullable(),
  distance_m: z.number().finite().min(0).max(2e7).nullable(),
  duration_s: z.number().finite().min(0).max(31536000).nullable(),
  elevation_gain_m: z.number().finite().min(0).max(1e6).nullable(),
  avg_speed_mps: z.number().finite().min(0).max(150).nullable(),
  max_speed_mps: z.number().finite().min(0).max(150).nullable(),
  extra: z.record(
    z.string(),
    z.union([z.string().max(200), z.number().finite(), z.null()]),
  ),
  warnings: z.array(z.string().max(100)).max(20),
  status: z.enum(["valid", "needs_review"]),
});
export type ParsedActivity = z.infer<typeof parsedSchema>;
export interface ImportCandidate extends ParsedActivity {
  key: string;
  fileHash: string;
  sessionIndex: number;
  fileName: string;
  format: "fit" | "gpx" | "tcx";
  decision?: "keep" | "skip";
  linkId?: string;
  linkKey?: string;
  duplicate?: "exact" | "probable";
  matches?: { id: string; title: string }[];
}
export interface ImportIssue {
  key: string;
  name: string;
  code: string;
}
export interface SourceFile {
  hash: string;
  name: string;
  format: "fit" | "gpx" | "tcx";
  bytes: ArrayBuffer;
}
export interface LocalImport {
  id: string;
  owner: string;
  createdAt: number;
  stage: "analysing" | "review" | "committing" | "partial" | "completed";
  items: ImportCandidate[];
  issues: ImportIssue[];
  retainSources: boolean;
  analysedBytes: number;
  serverStarted?: boolean;
}
export type AnalysisOutput =
  | { type: "file"; file: SourceFile; items: ImportCandidate[] }
  | { type: "issue"; issue: ImportIssue };
export type WorkerEvent =
  | AnalysisOutput
  | { type: "progress"; done: number; total: number; bytes: number }
  | { type: "done" }
  | { type: "fatal"; code: string };
export function classify(original: string): Category {
  const v = original
    .toLowerCase()
    .trim()
    .replace(/[ _-]+/g, " ");
  if (/^\d+$/.test(v)) return "unknown";
  if (["trail", "trail running", "trailrunning"].includes(v)) return "trail";
  if (["running", "run", "course", "course à pied", "jogging"].includes(v))
    return "running";
  if (
    [
      "cycling",
      "biking",
      "bike",
      "bicycling",
      "vélo",
      "road cycling",
      "mountain biking",
      "mountain bike",
      "virtual cycling",
    ].includes(v)
  )
    return "cycling";
  if (
    [
      "swimming",
      "swim",
      "natation",
      "pool swim",
      "open water",
      "lap swimming",
    ].includes(v)
  )
    return "swimming";
  return !v || ["generic", "other", "unknown", "multisport", "0"].includes(v)
    ? "unknown"
    : "unsupported";
}
export function normalize(
  input: Omit<ParsedActivity, "status" | "warnings" | "avg_speed_mps"> & {
    warnings?: string[];
    avg_speed_mps?: number | null;
  },
): ParsedActivity {
  const warnings = [...(input.warnings ?? [])];
  if (!input.started_at_utc) warnings.push("DATE_MANQUANTE");
  if (input.category === "unknown") warnings.push("SPORT_A_PRECISER");
  if (input.distance_m === null) warnings.push("DISTANCE_MANQUANTE");
  if (input.duration_s === null || input.duration_s === 0)
    warnings.push("DUREE_MANQUANTE");
  const avg =
    input.avg_speed_mps ??
    (input.distance_m !== null && input.duration_s
      ? input.distance_m / input.duration_s
      : null);
  if (avg !== null && avg > 50) warnings.push("VITESSE_A_VERIFIER");
  return parsedSchema.parse({
    ...input,
    avg_speed_mps: avg,
    warnings: [...new Set(warnings)],
    status: warnings.length ? "needs_review" : "valid",
  });
}
export function probable(a: ParsedActivity, b: ParsedActivity): boolean {
  return (
    !!a.started_at_utc &&
    !!b.started_at_utc &&
    a.category === b.category &&
    (a.category !== "unsupported" ||
      a.original_sport.toLowerCase() === b.original_sport.toLowerCase()) &&
    Math.abs(Date.parse(a.started_at_utc) - Date.parse(b.started_at_utc)) <=
      120 &&
    a.distance_m !== null &&
    b.distance_m !== null &&
    Math.abs(a.distance_m - b.distance_m) <=
      Math.max(100, a.distance_m * 0.02) &&
    a.duration_s !== null &&
    b.duration_s !== null &&
    Math.abs(a.duration_s - b.duration_s) <= Math.max(60, a.duration_s * 0.02)
  );
}
export async function sha256(buffer: ArrayBuffer) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
