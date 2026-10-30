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
import {
  ImportFailure,
  missingStorageObject,
  requestFailure,
  type ImportOperation,
} from "./import-errors";
export { ImportFailure, importError } from "./import-errors";
async function rpc<T>(
  name: ImportOperation,
  args: Record<string, unknown>,
): Promise<T> {
  try {
    const { data, error, status } = await getSupabaseClient().rpc(name, args);
    if (error) throw requestFailure(name, error, status);
    return data as T;
  } catch (error) {
    throw requestFailure(name, error);
  }
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
export async function uploadSource(
  owner: string,
  file: SourceFile,
  path: string,
  signal: AbortSignal,
) {
  const client = getSupabaseClient();
  const storage = client.storage.from("sport-sources");
  if (signal.aborted) throw new ImportFailure("ABORT");
  async function exists() {
    try {
      const { data, error } = await storage.info(path);
      if (error) {
        if (missingStorageObject(error)) return false;
        throw requestFailure("source.info", error);
      }
      if (!data) throw new ImportFailure("REQUEST_FAILED", "source.info");
      if (data.size !== file.bytes.byteLength)
        throw new ImportFailure("SOURCE_SIZE_MISMATCH", "source.info");
      return true;
    } catch (error) {
      throw requestFailure("source.info", error);
    }
  }
  if (await exists()) return;
  if (signal.aborted) throw new ImportFailure("ABORT");
  if (file.bytes.byteLength <= 6 * 1024 * 1024) {
    let error;
    try {
      // Blob becomes multipart/form-data in storage-js: its envelope inflates
      // Storage's preflight contentLength and fails our exact reserved-size RLS.
      // ArrayBuffer sends the source bytes directly, without relaxing the policy.
      ({ error } = await storage.upload(path, file.bytes, {
        contentType: "application/octet-stream",
        upsert: false,
      }));
    } catch (cause) {
      error = cause;
    }
    if (signal.aborted) throw new ImportFailure("ABORT");
    if (error) {
      const failure = requestFailure("source.upload", error);
      // Reconcile a concurrent upload or a lost response, never overwrite it.
      if (
        failure.status === 409 ||
        failure.code === "NETWORK_ERROR" ||
        failure.code === "SERVICE_UNAVAILABLE"
      ) {
        if (await exists().catch(() => false)) return;
      }
      throw failure;
    }
    return;
  }
  const blob = new Blob([file.bytes], { type: "application/octet-stream" });
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
        const { data, error } = await client.auth.getSession();
        if (error || !data.session)
          throw new ImportFailure("AUTH_REQUIRED", "source.resume");
        req.setHeader(
          "Authorization",
          `Bearer ${data.session?.access_token ?? ""}`,
        );
        req.setHeader("apikey", publicConfig!.key);
      },
      onError: (error) => {
        signal.removeEventListener("abort", abort);
        const response =
          "originalResponse" in error ? error.originalResponse : undefined;
        let reason: unknown =
          "causingError" in error && error.causingError
            ? error.causingError
            : error;
        try {
          reason = JSON.parse(response?.getBody() ?? "null") ?? reason;
        } catch {
          /* Never expose raw TUS bodies/URLs. */
        }
        reject(requestFailure("source.resume", reason, response?.getStatus()));
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
      .catch((error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(requestFailure("source.resume", error));
      });
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
    const { data, error, status } = await client
      .from("import_items")
      .select("source_key")
      .eq("batch_id", draft.id)
      .range(offset, offset + 999);
    if (error) throw requestFailure("import.receipts", error, status);
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
      if (!source)
        throw new ImportFailure("LOCAL_SOURCE_MISSING", "local.source");
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
  if (status !== "completed")
    throw new ImportFailure("PARTIAL", "finish_activity_import");
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
