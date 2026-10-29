import { Upload } from "tus-js-client";
import { getSupabaseClient, publicConfig } from "@/lib/supabase";
import {
  LIMITS,
  probable,
  type ImportCandidate,
  type LocalImport,
  type SourceFile,
} from "./model";
import {
  getSource,
  persistItems,
  removeDraft,
  updateMeta,
} from "./local-store";
export class ImportFailure extends Error {
  constructor(public code: string) {
    super(code);
  }
}
export function importError(e: unknown) {
  const code =
    e instanceof ImportFailure
      ? e.code
      : typeof e === "object" && e !== null && "message" in e
        ? String(e.message)
        : "";
  if (code.includes("DUPLICATE_REVIEW_REQUIRED"))
    return "Un doublon probable est apparu. Vérifie les choix puis confirme à nouveau.";
  if (code.includes("SOURCE_QUOTA_EXCEEDED"))
    return "Le plafond technique de sources privées (1 Go) est atteint. Supprime des sources ou importe sans les conserver.";
  if (code.includes("ABORT"))
    return "Import interrompu. Tu peux le reprendre ici.";
  if (
    code.includes("LIMITE") ||
    code.includes("TROP_") ||
    code.includes("VOLUMINEUSE")
  )
    return "Limite de sécurité atteinte. Divise ton historique en plusieurs sélections plus petites.";
  return "L’opération n’a pas abouti. Vérifie ta connexion et reprends l’import. Aucune activité déjà enregistrée ne sera ajoutée deux fois.";
}
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabaseClient().rpc(name, args);
  if (error) throw new ImportFailure(error.message);
  return data as T;
}
export async function reviewDuplicates(
  items: ImportCandidate[],
): Promise<ImportCandidate[]> {
  const result = items.map((i) => ({
    ...i,
    matches: [] as { id: string; title: string }[],
    duplicate: undefined as ImportCandidate["duplicate"],
  }));
  for (let i = 0; i < result.length; i += 100) {
    const rows = await rpc<
      {
        key: string;
        exactId: string | null;
        matches: { id: string; title: string }[];
      }[]
    >("find_activity_duplicates", { p_items: result.slice(i, i + 100) });
    for (const row of rows) {
      const item = result.find((i) => i.key === row.key);
      if (!item) continue;
      item.matches = row.matches;
      if (row.exactId) {
        item.duplicate = "exact";
        item.linkId = row.exactId;
      } else if (row.matches.length) item.duplicate = "probable";
    }
  }
  const ordered = [...result].sort((a, b) =>
    (a.started_at_utc ?? "").localeCompare(b.started_at_utc ?? ""),
  );
  for (let i = 0; i < ordered.length; i++) {
    const item = ordered[i]!;
    for (let j = i - 1; j >= 0; j--) {
      const previous = ordered[j]!;
      if (
        !item.started_at_utc ||
        !previous.started_at_utc ||
        Date.parse(item.started_at_utc) - Date.parse(previous.started_at_utc) >
          120
      )
        break;
      if (item.key !== previous.key && probable(item, previous)) {
        item.duplicate ??= "probable";
        item.matches!.push({
          id: `key:${previous.key}`,
          title: previous.title + " · sélection actuelle",
        });
      }
    }
  }
  return result;
}
async function uploadSource(
  owner: string,
  file: SourceFile,
  path: string,
  signal: AbortSignal,
) {
  const client = getSupabaseClient();
  const storage = client.storage.from("sport-sources");
  const existing = await storage.info(path);
  if (existing.data) return;
  if (signal.aborted) throw new ImportFailure("ABORT");
  const blob = new Blob([file.bytes], { type: "application/octet-stream" });
  if (blob.size <= 6 * 1024 * 1024) {
    const { error } = await storage.upload(path, blob, {
      contentType: "application/octet-stream",
      upsert: false,
    });
    if (error && !(await storage.info(path)).data)
      throw new ImportFailure("UPLOAD_FAILED");
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(blob, {
      endpoint: `${publicConfig!.url}/storage/v1/upload/resumable`,
      chunkSize: 6 * 1024 * 1024,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      retryDelays: [0, 1000, 3000],
      fingerprint: async () => `launch:${owner}:${file.hash}`,
      metadata: {
        bucketName: "sport-sources",
        objectName: path,
        contentType: "application/octet-stream",
        cacheControl: "0",
      },
      onBeforeRequest: async (req) => {
        const { data } = await client.auth.getSession();
        req.setHeader(
          "Authorization",
          `Bearer ${data.session?.access_token ?? ""}`,
        );
        req.setHeader("apikey", publicConfig!.key);
      },
      onError: () => {
        signal.removeEventListener("abort", abort);
        reject(new ImportFailure("UPLOAD_FAILED"));
      },
      onSuccess: () => {
        signal.removeEventListener("abort", abort);
        resolve();
      },
    });
    const abort = () => {
      void upload.abort(false);
      reject(new ImportFailure("ABORT"));
    };
    signal.addEventListener("abort", abort, { once: true });
    void upload
      .findPreviousUploads()
      .then((previous) => {
        if (signal.aborted) return abort();
        if (previous[0]) upload.resumeFromPreviousUpload(previous[0]);
        upload.start();
      })
      .catch(() => reject(new ImportFailure("UPLOAD_FAILED")));
  });
}
export async function commitDraft(
  draft: LocalImport,
  signal: AbortSignal,
  onProgress: (n: number, total: number) => void,
) {
  const client = getSupabaseClient();
  draft.serverStarted = true;
  draft.stage = "committing";
  await updateMeta(draft);
  await rpc("begin_activity_import", {
    p_id: draft.id,
    p_total: draft.items.length + draft.issues.length,
    p_retain: draft.retainSources,
  });
  // Paginate receipts; PostgREST returns at most 1000 rows by default.
  const done = new Set<string>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("import_items")
      .select("source_key")
      .eq("batch_id", draft.id)
      .range(offset, offset + 999);
    if (error) throw error;
    for (const r of data ?? []) done.add(r.source_key as string);
    if ((data?.length ?? 0) < 1000) break;
  }
  let completed = done.size;
  onProgress(completed, draft.items.length + draft.issues.length);
  const sources = new Set<string>();
  const raw = draft.items.filter((i) => !done.has(i.key));
  const pending = orderForCommit(raw);
  for (let offset = 0; offset < pending.length; offset += LIMITS.batch) {
    if (signal.aborted) throw new ImportFailure("ABORT");
    const group = pending.slice(offset, offset + LIMITS.batch);
    for (const item of group) {
      if (item.decision === "skip" || sources.has(item.fileHash)) continue;
      const source = await getSource(draft.id, item.fileHash);
      if (!source) throw new ImportFailure("LOCAL_SOURCE_MISSING");
      const f = await rpc<{ storage_path: string; retained: boolean }>(
        "reserve_activity_file",
        {
          p_hash: source.hash,
          p_name: source.name,
          p_format: source.format,
          p_bytes: source.bytes.byteLength,
          p_batch: draft.id,
        },
      );
      if (f.retained)
        await uploadSource(draft.owner, source, f.storage_path, signal);
      sources.add(item.fileHash);
    }
    if (signal.aborted) throw new ImportFailure("ABORT");
    await rpc("commit_activity_import", { p_batch: draft.id, p_items: group });
    completed += group.length;
    onProgress(completed, draft.items.length + draft.issues.length);
  }
  for (let offset = 0; offset < draft.issues.length; offset += LIMITS.batch) {
    if (signal.aborted) throw new ImportFailure("ABORT");
    const group = draft.issues.slice(offset, offset + LIMITS.batch);
    await rpc("record_import_errors", { p_batch: draft.id, p_errors: group });
    completed += group.length;
    onProgress(completed, draft.items.length + draft.issues.length);
  }
  const status = await rpc<string>("finish_activity_import", {
    p_batch: draft.id,
  });
  if (status !== "completed") throw new ImportFailure("PARTIAL");
  await removeDraft(draft.id);
  draft.stage = "completed";
}
export async function saveReview(draft: LocalImport, items: ImportCandidate[]) {
  await persistItems(draft.id, items);
}

export function orderForCommit(items: ImportCandidate[]) {
  const map = new Map(items.map((i) => [i.key, i]));
  const result: ImportCandidate[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  function visit(item: ImportCandidate) {
    if (visited.has(item.key)) return;
    if (visiting.has(item.key)) throw new ImportFailure("LINK_CYCLE");
    visiting.add(item.key);
    if (item.linkKey) {
      const parent = map.get(item.linkKey);
      if (parent) {
        if (parent.decision === "skip")
          throw new ImportFailure("LINK_TARGET_SKIPPED");
        visit(parent);
      }
    }
    visiting.delete(item.key);
    visited.add(item.key);
    result.push(item);
  }
  for (const item of items) visit(item);
  return result;
}
