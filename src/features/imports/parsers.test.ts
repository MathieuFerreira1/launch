// @vitest-environment node
import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js";
import {
  gpxXml,
  tcxXml,
  fitBytes,
  largeGpx,
} from "../../../tests/fixtures/synthetic";
import { parseXml } from "./parsers/xml";
import { parseFit } from "./parsers/fit";
import { analyzeFiles, safePath } from "./analyze";
import { classify, probable, type AnalysisOutput } from "./model";
const bytes = (s: string) => new TextEncoder().encode(s).buffer;
describe("synthetic sport formats", () => {
  it("extracts FIT summary and verifies CRC", () => {
    const data = fitBytes();
    const a = parseFit(data)[0]!;
    expect(a.category).toBe("running");
    expect(a.distance_m).toBe(5000);
    expect(a.duration_s).toBe(1800);
    expect(a.elevation_gain_m).toBe(40);
    expect(a.extra.avg_heart_rate_bpm).toBe(140);
    expect(a.started_at_utc).toBe("2026-01-02T08:00:00.000Z");
    const corrupt = data.slice(0);
    const view = new Uint8Array(corrupt);
    view[30] = (view[30] ?? 0) ^ 1;
    expect(() => parseFit(corrupt)).toThrow("FIT_INTEGRITE");
  });
  it("parses GPX distances/times without inferring Trail from elevation", () => {
    const a = parseXml(bytes(gpxXml())).activities[0]!;
    expect(a.category).toBe("running");
    expect(a.distance_m).toBeCloseTo(5000, -1);
    expect(a.duration_s).toBe(1800);
    expect(a.elevation_gain_m).toBe(40);
  });
  it("parses TCX with namespace and summary metrics", () => {
    const a = parseXml(bytes(tcxXml("Biking"))).activities[0]!;
    expect(a.category).toBe("cycling");
    expect(a.distance_m).toBe(5000);
    expect(a.extra.calories_kcal).toBe(300);
  });
  it("keeps unknown and unsupported sports and marks routes without timestamps", () => {
    expect(classify("")).toBe("unknown");
    expect(classify("Ski")).toBe("unsupported");
    const a = parseXml(bytes(gpxXml("").replace(/<time>.*?<\/time>/g, "")))
      .activities[0]!;
    expect(a.status).toBe("needs_review");
    expect(a.started_at_utc).toBeNull();
    expect(a.warnings).toContain("PARCOURS_SANS_PREUVE_DE_SEANCE");
    expect(parseFit(fitBytes("swimming"))[0]?.category).toBe("swimming");
  });
  it("rejects malformed XML, DTD, entities, invalid paths and corrupt formats", () => {
    for (const s of [
      "<gpx><trk></gpx>",
      '<!DOCTYPE gpx [<!ENTITY x SYSTEM "file:///etc/passwd">]><gpx/>',
    ])
      expect(() => parseXml(bytes(s))).toThrow();
    for (const p of ["../a.gpx", "/a.gpx", "C:\\a.gpx", "a/../../b.fit"])
      expect(safePath(p)).toBe(false);
    expect(safePath("export/2026/sortie.gpx")).toBe(true);
  });
  it("reports the same activity in different formats as probable, never silently merges", () => {
    const gpx = parseXml(bytes(gpxXml())).activities[0]!;
    const tcx = parseXml(bytes(tcxXml())).activities[0]!;
    expect(probable(gpx, tcx)).toBe(true);
    expect(probable(gpx, { ...tcx, category: "trail" })).toBe(false);
  });
  it("iterates a mixed ZIP with subdirectories, ignores non-sport files and rejects dangerous paths", async () => {
    const zip = new ZipWriter(new BlobWriter(), { useWebWorkers: false });
    await zip.add("nested/run.gpx", new TextReader(gpxXml()));
    await zip.add("nested/swim.tcx", new TextReader(tcxXml("Swimming")));
    await zip.add("readme.txt", new TextReader("synthetic"));
    const blob = await zip.close();
    const outputs: AnalysisOutput[] = [];
    await analyzeFiles(
      [new File([blob], "archive.zip")],
      async (r) => {
        outputs.push(r);
      },
      () => {},
    );
    expect(outputs.filter((r) => r.type === "file")).toHaveLength(2);
    expect(
      outputs.filter((r) => r.type === "issue").map((r) => r.issue.code),
    ).toEqual(expect.arrayContaining(["FORMAT_NON_PRIS_EN_CHARGE"]));
  }, 15000);
  it("measures progressive analysis of 200 synthetic files", async () => {
    const zip = new ZipWriter(new BlobWriter(), { useWebWorkers: false });
    for (let i = 0; i < 200; i++)
      await zip.add(
        `years/${i}/run.gpx`,
        new TextReader(
          largeGpx(new Date(Date.UTC(2025, 0, 1 + i, 8)).toISOString()),
        ),
      );
    const blob = await zip.close();
    let count = 0;
    const before = performance.now();
    await analyzeFiles(
      [new File([blob], "history.zip")],
      async (r) => {
        if (r.type === "file") count++;
      },
      () => {},
    );
    const ms = performance.now() - before;
    writeFileSync(
      "/tmp/launch-import-benchmark.json",
      JSON.stringify({
        files: count,
        pointsPerFile: 500,
        compressedBytes: blob.size,
        analysisMs: Math.round(ms),
      }),
    );
    console.info(
      `Synthetic benchmark: ${count} files, ${blob.size} compressed bytes, ${Math.round(ms)} ms`,
    );
    expect(count).toBe(200);
    expect(ms).toBeLessThan(20000);
  }, 30000);
});

it("rejects ZIP bombs and nested archives without inflating them", async () => {
  const zip = new ZipWriter(new BlobWriter(), { useWebWorkers: false });
  await zip.add(
    "bomb.gpx",
    new TextReader("<gpx><!--" + "x".repeat(1024 * 1024) + "--></gpx>"),
  );
  await zip.add("nested.zip", new TextReader("PK synthetic"));
  const blob = await zip.close();
  const outputs: AnalysisOutput[] = [];
  await analyzeFiles(
    [new File([blob], "unsafe.zip")],
    async (r) => {
      outputs.push(r);
    },
    () => {},
  );
  expect(outputs.filter((r) => r.type === "file")).toHaveLength(0);
  expect(
    outputs.filter((r) => r.type === "issue").map((r) => r.issue.code),
  ).toEqual(
    expect.arrayContaining([
      "LIMITE_DECOMPRESSION",
      "FORMAT_NON_PRIS_EN_CHARGE",
    ]),
  );
});
it("reanalysing the same ZIP gives the same stable activity keys", async () => {
  const zip = new ZipWriter(new BlobWriter(), { useWebWorkers: false });
  await zip.add("run.gpx", new TextReader(gpxXml()));
  const blob = await zip.close();
  const keys: string[][] = [];
  for (let i = 0; i < 2; i++) {
    const run: string[] = [];
    await analyzeFiles(
      [new File([blob], "same.zip")],
      async (r) => {
        if (r.type === "file") run.push(...r.items.map((i) => i.key));
      },
      () => {},
    );
    keys.push(run);
  }
  expect(keys[0]).toEqual(keys[1]);
  expect(keys[0]).toHaveLength(1);
});
it("reports a ZIP path traversal as an invalid archive", async () => {
  const zip = new ZipWriter(new BlobWriter(), { useWebWorkers: false });
  await zip.add("../unsafe.gpx", new TextReader(gpxXml()));
  const blob = await zip.close();
  const outputs: AnalysisOutput[] = [];
  await analyzeFiles(
    [new File([blob], "traversal.zip")],
    async (r) => {
      outputs.push(r);
    },
    () => {},
  );
  expect(
    outputs.some(
      (r) => r.type === "issue" && r.issue.code === "ZIP_STRUCTURE_INVALIDE",
    ),
  ).toBe(true);
  expect(outputs.some((r) => r.type === "file")).toBe(false);
});
