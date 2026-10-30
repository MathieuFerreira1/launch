import { BlobReader, ZipReader } from "@zip.js/zip.js";
import { LIMITS, sha256, type AnalysisOutput } from "./model";
import { parseXml } from "./parsers/xml";
import { parseFit } from "./parsers/fit";
export function safePath(name: string) {
  const p = name.replace(/\\/g, "/");
  return (
    !!p &&
    p.length <= 512 &&
    !p.startsWith("/") &&
    !/^[a-z]:/i.test(p) &&
    !p.includes("\0") &&
    !p.split("/").some((s) => s === ".." || s === ".") &&
    p.split("/").length <= LIMITS.depth
  );
}
export async function analyzeFiles(
  files: File[],
  emit: (output: AnalysisOutput) => Promise<void>,
  progress: (done: number, total: number, bytes: number) => void,
  aborted: () => boolean = () => false,
) {
  if (files.length > LIMITS.entries) throw new Error("TROP_DE_FICHIERS");
  const total = files.reduce((n, f) => n + f.size, 0);
  if (total > LIMITS.archiveBytes)
    throw new Error("SELECTION_TROP_VOLUMINEUSE");
  let expanded = 0,
    entries = 0,
    read = 0,
    activityCount = 0;
  async function issue(name: string, code: string) {
    await emit({
      type: "issue",
      issue: {
        key: await sha256(
          new TextEncoder().encode(`${entries}:${name}`).buffer,
        ),
        name: name.slice(0, 160),
        code,
      },
    });
  }
  async function parse(name: string, bytes: ArrayBuffer) {
    if (aborted()) throw new Error("ANNULE");
    try {
      const hash = await sha256(bytes);
      let format: "fit" | "gpx" | "tcx";
      let activities;
      if (new TextDecoder().decode(bytes.slice(8, 12)) === ".FIT") {
        format = "fit";
        activities = parseFit(bytes);
      } else {
        const p = parseXml(bytes);
        format = p.format;
        activities = p.activities;
      }
      activityCount += activities.length;
      if (activityCount > 10000) throw new Error("TROP_D_ACTIVITES");
      if (activities.length > 100) throw new Error("TROP_DE_SESSIONS");
      await emit({
        type: "file",
        file: {
          hash,
          name: name.split("/").at(-1)!.slice(0, 160),
          format,
          bytes,
        },
        items: activities.map((a, i) => ({
          ...a,
          key: `${hash}:${i}`,
          fileHash: hash,
          sessionIndex: i,
          fileName: name.slice(0, 160),
          format,
        })),
      });
    } catch (e) {
      const code =
        e instanceof Error && /^[A-Z_]+$/.test(e.message)
          ? e.message
          : "FICHIER_INVALIDE";
      await issue(name, code);
    }
  }
  for (const file of files) {
    if (aborted()) throw new Error("ANNULE");
    if (file.size > LIMITS.archiveBytes)
      throw new Error("SELECTION_TROP_VOLUMINEUSE");
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    const zip = head[0] === 80 && head[1] === 75;
    if (zip) {
      let compressedDone = 0;
      const reader = new ZipReader(new BlobReader(file), {
        useWebWorkers: false,
      });
      try {
        for await (const entry of reader.getEntriesGenerator()) {
          if (++entries > LIMITS.entries) throw new Error("TROP_DE_FICHIERS");
          if (!safePath(entry.filename)) {
            await issue(entry.filename, "CHEMIN_ZIP_INTERDIT");
            continue;
          }
          if (entry.directory) continue;
          if (entry.encrypted) {
            await issue(entry.filename, "ZIP_CHIFFRE_NON_PRIS_EN_CHARGE");
            continue;
          }
          if (!/\.(fit|gpx|tcx)$/i.test(entry.filename)) {
            await issue(entry.filename, "FORMAT_NON_PRIS_EN_CHARGE");
            continue;
          }
          if (
            entry.uncompressedSize > LIMITS.fileBytes ||
            entry.uncompressedSize / Math.max(1, entry.compressedSize) >
              LIMITS.ratio
          ) {
            await issue(entry.filename, "LIMITE_DECOMPRESSION");
            continue;
          }
          let size = 0;
          const chunks: Uint8Array[] = [];
          try {
            await entry.getData(
              new WritableStream<Uint8Array>({
                write(chunk) {
                  size += chunk.length;
                  expanded += chunk.length;
                  if (
                    size > LIMITS.fileBytes ||
                    expanded > LIMITS.expandedBytes
                  )
                    throw new Error("LIMITE_DECOMPRESSION");
                  chunks.push(chunk);
                },
              }),
              { checkSignature: true, useWebWorkers: false },
            );
            const data = new Uint8Array(size);
            let offset = 0;
            for (const c of chunks) {
              data.set(c, offset);
              offset += c.length;
            }
            await parse(entry.filename, data.buffer);
          } catch (e) {
            if (expanded > LIMITS.expandedBytes)
              throw new Error("LIMITE_DECOMPRESSION", { cause: e });
            await issue(
              entry.filename,
              e instanceof Error && e.message === "LIMITE_DECOMPRESSION"
                ? "LIMITE_DECOMPRESSION"
                : "ZIP_ENTREE_CORROMPUE",
            );
          }
          compressedDone += entry.compressedSize;
          progress(
            Math.min(total, read + Math.min(file.size, compressedDone)),
            total,
            expanded,
          );
        }
      } catch (error) {
        if (
          error instanceof Error &&
          ["TROP_DE_FICHIERS", "LIMITE_DECOMPRESSION", "ANNULE"].includes(
            error.message,
          )
        )
          throw error;
        await issue(file.name, "ZIP_STRUCTURE_INVALIDE");
      } finally {
        await reader.close();
      }
    } else {
      entries++;
      if (!file.size || file.size > LIMITS.fileBytes) {
        await issue(file.name, "TAILLE_FICHIER_INVALIDE");
      } else {
        expanded += file.size;
        if (expanded > LIMITS.expandedBytes)
          throw new Error("LIMITE_DECOMPRESSION");
        await parse(file.name, await file.arrayBuffer());
      }
    }
    read += file.size;
    progress(read, total, expanded);
  }
}
