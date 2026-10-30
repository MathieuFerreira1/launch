import { Decoder, Stream } from "@garmin/fitsdk";
import { classify, normalize, type ParsedActivity } from "../model";
const value = (x: unknown): number | null =>
  typeof x === "number" && Number.isFinite(x) ? x : null;
const iso = (x: unknown): string | null =>
  x instanceof Date && !Number.isNaN(x.valueOf()) ? x.toISOString() : null;
export function parseFit(bytes: ArrayBuffer): ParsedActivity[] {
  const decoder = new Decoder(Stream.fromArrayBuffer(bytes));
  if (!decoder.isFIT() || !decoder.checkIntegrity())
    throw new Error("FIT_INTEGRITE_INVALIDE");
  const { messages, errors } = decoder.read();
  if (errors.length) throw new Error("FIT_CORROMPU");
  const sessions = messages.sessionMesgs ?? [];
  if (!sessions.length) throw new Error("FIT_SANS_SESSION");
  return sessions.map((s) => {
    const original =
      s.subSport === "trail" ? "Trail running" : String(s.sport ?? "");
    return normalize({
      title: "Sortie FIT",
      original_sport: original.slice(0, 120),
      category: classify(original),
      started_at_utc: iso(s.startTime),
      distance_m: value(s.totalDistance),
      duration_s: value(s.totalTimerTime) ?? value(s.totalElapsedTime),
      elevation_gain_m: value(s.totalAscent),
      avg_speed_mps: value(s.enhancedAvgSpeed) ?? value(s.avgSpeed),
      max_speed_mps: value(s.enhancedMaxSpeed) ?? value(s.maxSpeed),
      extra: {
        parser_version: "launch-1",
        elapsed_duration_s: value(s.totalElapsedTime),
        avg_heart_rate_bpm: value(s.avgHeartRate),
        max_heart_rate_bpm: value(s.maxHeartRate),
        avg_cadence_rpm: value(s.avgCadence),
        calories_kcal: value(s.totalCalories),
        pool_length_m: value(s.poolLength),
        lap_count: value(s.numLaps),
        distance_source: "fit_session",
      },
    });
  });
}
