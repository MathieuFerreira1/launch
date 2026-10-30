import { XMLParser, XMLValidator } from "fast-xml-parser";
import { classify, normalize, type ParsedActivity } from "../model";
type Obj = Record<string, unknown>;
const obj = (x: unknown): Obj => (x && typeof x === "object" ? (x as Obj) : {});
const list = (x: unknown): unknown[] =>
  x === undefined ? [] : Array.isArray(x) ? x : [x];
const num = (x: unknown): number | null =>
  x === undefined || x === null || x === "" || !Number.isFinite(Number(x))
    ? null
    : Number(x);
function iso(x: unknown): string | null {
  if (typeof x !== "string" || !/(Z|[+-]\d{2}:\d{2})$/.test(x)) return null;
  const d = new Date(x);
  return Number.isFinite(d.valueOf()) ? d.toISOString() : null;
}
function text(x: unknown): string {
  return typeof x === "string" || typeof x === "number" ? String(x) : "";
}
function length(points: Obj[]) {
  let sum = 0,
    previous: Obj | undefined;
  for (const p of points) {
    if (previous) {
      const lat = num(p["@_lat"]),
        lon = num(p["@_lon"]),
        la = num(previous["@_lat"]),
        lo = num(previous["@_lon"]);
      if (lat !== null && lon !== null && la !== null && lo !== null) {
        const rad = Math.PI / 180;
        const h =
          Math.sin(((lat - la) * rad) / 2) ** 2 +
          Math.cos(lat * rad) *
            Math.cos(la * rad) *
            Math.sin(((lon - lo) * rad) / 2) ** 2;
        sum +=
          6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
      }
    }
    previous = p;
  }
  return points.length > 1 ? sum : null;
}
function ascent(points: Obj[], field: string) {
  let prev: number | null = null,
    sum = 0,
    count = 0;
  for (const p of points) {
    const n = num(p[field]);
    if (n !== null) {
      if (prev !== null && n > prev) sum += n - prev;
      prev = n;
      count++;
    }
  }
  return count > 1 ? sum : null;
}
function gpx(root: Obj): ParsedActivity[] {
  const out: ParsedActivity[] = [];
  for (const raw of list(root.trk)) {
    const t = obj(raw);
    const segments = list(t.trkseg);
    const points = segments.flatMap((s) => list(obj(s).trkpt).map(obj));
    const times = points
      .map((p) => iso(p.time))
      .filter((v): v is string => !!v);
    const sport = text(t.type);
    const started = times[0] ?? null;
    const duration =
      times.length > 1
        ? Math.max(
            0,
            (Date.parse(times.at(-1)!) - Date.parse(times[0]!)) / 1000,
          )
        : null;
    // Never bridge disconnected GPX segments when estimating distance/ascent.
    const distances = segments
      .map((s) => length(list(obj(s).trkpt).map(obj)))
      .filter((v): v is number => v !== null);
    const elevations = segments
      .map((s) => ascent(list(obj(s).trkpt).map(obj), "ele"))
      .filter((v): v is number => v !== null);
    out.push(
      normalize({
        title: text(t.name).slice(0, 160) || "Sortie GPX",
        original_sport: sport.slice(0, 120),
        category: classify(sport),
        started_at_utc: started,
        distance_m: distances.length
          ? distances.reduce((a, b) => a + b, 0)
          : null,
        duration_s: duration,
        elevation_gain_m: elevations.length
          ? elevations.reduce((a, b) => a + b, 0)
          : null,
        max_speed_mps: null,
        extra: {
          parser_version: "launch-1",
          distance_source: "gps_estimate",
          duration_source: "elapsed_timestamps",
        },
        warnings: !times.length ? ["PARCOURS_SANS_PREUVE_DE_SEANCE"] : [],
      }),
    );
  }
  if (!out.length) throw new Error("GPX_SANS_ACTIVITE");
  return out;
}
function tcx(root: Obj): ParsedActivity[] {
  const out: ParsedActivity[] = [];
  for (const raw of list(obj(root.Activities).Activity)) {
    const a = obj(raw);
    const laps = list(a.Lap).map(obj);
    const points = laps.flatMap((l) =>
      list(l.Track).flatMap((t) => list(obj(t).Trackpoint).map(obj)),
    );
    const times = points
      .map((p) => iso(p.Time))
      .filter((v): v is string => !!v);
    const sport = text(a["@_Sport"]);
    const sum = (field: string) => {
      const ns = laps
        .map((l) => num(l[field]))
        .filter((v): v is number => v !== null);
      return ns.length ? ns.reduce((a, b) => a + b, 0) : null;
    };
    const dist = sum("DistanceMeters") ?? num(points.at(-1)?.DistanceMeters);
    const duration =
      sum("TotalTimeSeconds") ??
      (times.length > 1
        ? (Date.parse(times.at(-1)!) - Date.parse(times[0]!)) / 1000
        : null);
    const max = laps
      .map((l) => num(l.MaximumSpeed))
      .filter((v): v is number => v !== null);
    out.push(
      normalize({
        title: "Sortie TCX",
        original_sport: sport.slice(0, 120),
        category: classify(sport),
        started_at_utc:
          iso(a.Id) ?? iso(laps[0]?.["@_StartTime"]) ?? times[0] ?? null,
        distance_m: dist,
        duration_s: duration,
        elevation_gain_m: ascent(points, "AltitudeMeters"),
        max_speed_mps: max.length ? Math.max(...max) : null,
        extra: {
          parser_version: "launch-1",
          lap_count: laps.length,
          calories_kcal: sum("Calories"),
          source_activity_id: text(a.Id).slice(0, 200),
          distance_source: "tcx_summary",
        },
      }),
    );
  }
  if (!out.length) throw new Error("TCX_SANS_ACTIVITE");
  return out;
}
export function parseXml(bytes: ArrayBuffer): {
  format: "gpx" | "tcx";
  activities: ParsedActivity[];
} {
  const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (/<!\s*(DOCTYPE|ENTITY)/i.test(content))
    throw new Error("XML_ENTITES_INTERDITES");
  if (XMLValidator.validate(content) !== true) throw new Error("XML_INVALIDE");
  const p = obj(
    new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true,
      processEntities: false,
      parseTagValue: false,
      parseAttributeValue: false,
    }).parse(content),
  );
  if (p.gpx) return { format: "gpx", activities: gpx(obj(p.gpx)) };
  if (p.TrainingCenterDatabase)
    return { format: "tcx", activities: tcx(obj(p.TrainingCenterDatabase)) };
  throw new Error("FORMAT_NON_RECONNU");
}
