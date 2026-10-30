// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { commitDraft, uploadSource, importError } from "./import-api";
import { missingStorageObject, requestFailure } from "./import-errors";
import type { LocalImport, SourceFile } from "./model";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  getSource: vi.fn(),
  removeDraft: vi.fn(),
  updateMeta: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({
  publicConfig: {
    url: "https://synthetic.example.test",
    key: "sb_publishable_synthetic",
  },
  getSupabaseClient: () =>
    createClient("https://synthetic.example.test", "sb_publishable_synthetic", {
      global: { fetch: mocks.fetch },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }),
}));
vi.mock("./local-store", () => ({ ...mocks, persistItems: vi.fn() }));

const owner = "20000000-0000-0000-0000-000000000001";
const file: SourceFile = {
  hash: "a".repeat(64),
  name: "synthetic.gpx",
  format: "gpx",
  bytes: new TextEncoder().encode("<gpx>synthetic</gpx>").buffer,
};
const path = `${owner}/${file.hash}`;
const missing = () =>
  Response.json(
    {
      statusCode: "404",
      code: "NoSuchKey",
      error: "not_found",
      message: "Object not found",
    },
    { status: 400 },
  );
const signal = () => new AbortController().signal;
const draft = (): LocalImport => ({
  id: "30000000-0000-0000-0000-000000000001",
  owner,
  createdAt: Date.now(),
  retainSources: true,
  stage: "review",
  analysedBytes: 0,
  issues: [],
  items: [
    {
      key: `${file.hash}:0`,
      fileHash: file.hash,
      sessionIndex: 0,
      fileName: file.name,
      format: "gpx",
      title: "Synthetic run",
      original_sport: "Running",
      category: "running",
      started_at_utc: "2026-01-02T08:00:00Z",
      distance_m: 5000,
      duration_s: 1800,
      elevation_gain_m: 40,
      avg_speed_mps: 5000 / 1800,
      max_speed_mps: null,
      extra: {},
      warnings: [],
      status: "valid",
    },
  ],
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSource.mockResolvedValue(file);
  mocks.removeDraft.mockResolvedValue(undefined);
  mocks.updateMeta.mockResolvedValue(undefined);
});

describe("source upload through the real storage-js client", () => {
  it("recognizes legacy 404 bodies but never masks authorization or transport errors", () => {
    expect(
      missingStorageObject({
        status: 400,
        statusCode: "404",
        message: "Object not found",
      }),
    ).toBe(true);
    expect(missingStorageObject({ status: 403, code: "NoSuchKey" })).toBe(
      false,
    );
    expect(missingStorageObject({ status: 500, code: "not_found" })).toBe(
      false,
    );
    expect(
      missingStorageObject({
        status: 400,
        statusCode: "403",
        code: "NoSuchKey",
      }),
    ).toBe(false);
  });
  it("treats NoSuchKey/HTTP 400 as the first upload and sends exact bytes without multipart", async () => {
    mocks.fetch.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.includes("/object/info/")) return missing();
      expect(init.body).toBe(file.bytes);
      expect(new Headers(init.headers).get("content-type")).toBe(
        "application/octet-stream",
      );
      expect(new Headers(init.headers).get("x-upsert")).toBe("false");
      return Response.json({ Id: "synthetic", Key: "synthetic" });
    });
    await uploadSource(owner, file, path, signal());
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("keeps an already uploaded source immutable and checks its reserved size", async () => {
    mocks.fetch.mockResolvedValue(
      Response.json({ size: file.bytes.byteLength }),
    );
    await uploadSource(owner, file, path, signal());
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    mocks.fetch.mockResolvedValue(Response.json({ size: 1 }));
    await expect(
      uploadSource(owner, file, path, signal()),
    ).rejects.toMatchObject({
      code: "SOURCE_SIZE_MISMATCH",
      operation: "source.info",
    });
  });
  it("does not treat forbidden checks or missing buckets as missing objects", async () => {
    for (const code of ["AccessDenied", "NoSuchBucket"]) {
      mocks.fetch.mockImplementation(async () =>
        Response.json(
          { statusCode: "403", code, message: "synthetic private response" },
          { status: 400 },
        ),
      );
      await expect(
        uploadSource(owner, file, path, signal()),
      ).rejects.toMatchObject({ operation: "source.info" });
    }
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("identifies the denied POST and never exposes the Storage response", async () => {
    const privateText =
      "row-level security rejected synthetic-owner/private-file.gpx token=synthetic-secret";
    mocks.fetch.mockImplementation(async (url: string) =>
      url.includes("/object/info/")
        ? missing()
        : Response.json(
            { statusCode: "403", code: "AccessDenied", message: privateText },
            { status: 400 },
          ),
    );
    const failure = await uploadSource(owner, file, path, signal()).catch(
      (e: unknown) => e,
    );
    expect(failure).toMatchObject({
      code: "RLS_DENIED",
      operation: "source.upload",
      status: 400,
    });
    expect(importError(failure)).toContain("Envoi du fichier");
    expect(importError(failure)).toContain("RLS_DENIED");
    expect(JSON.stringify(failure)).not.toContain(privateText);
    expect(importError(failure)).not.toContain("private-file");
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("reconciles a successful upload whose response was lost", async () => {
    let uploaded = false;
    mocks.fetch.mockImplementation(async (url: string) => {
      if (url.includes("/object/info/"))
        return uploaded
          ? Response.json({ size: file.bytes.byteLength })
          : missing();
      uploaded = true;
      throw new TypeError("Failed to fetch synthetic private URL");
    });
    await uploadSource(owner, file, path, signal());
    expect(mocks.fetch).toHaveBeenCalledTimes(3);
  });
});

describe("resumable commits and useful RPC failures", () => {
  it("reuses an uploaded file after a failed commit, then skips its committed receipt on replay", async () => {
    let uploaded = false,
      committed = false,
      uploads = 0,
      commits = 0;
    mocks.fetch.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.includes("/object/info/"))
        return uploaded
          ? Response.json({ size: file.bytes.byteLength })
          : missing();
      if (url.includes("/storage/v1/object/")) {
        uploaded = true;
        uploads++;
        return Response.json({ Id: "synthetic", Key: "synthetic" });
      }
      if (url.includes("/import_items?"))
        return Response.json(
          committed ? [{ source_key: `${file.hash}:0` }] : [],
        );
      if (url.endsWith("/reserve_activity_file"))
        return Response.json({ retained: true, storage_path: path });
      if (url.endsWith("/commit_activity_import")) {
        commits++;
        if (commits === 1)
          return Response.json(
            { code: "P0001", message: "synthetic private server response" },
            { status: 503 },
          );
        expect(JSON.parse(String(init.body)).p_items).toHaveLength(1);
        committed = true;
        return Response.json(1);
      }
      if (url.endsWith("/finish_activity_import"))
        return Response.json("completed");
      return Response.json({});
    });
    const d = draft();
    await expect(commitDraft(d, signal(), () => {})).rejects.toMatchObject({
      operation: "commit_activity_import",
      code: "SERVICE_UNAVAILABLE",
      status: 503,
    });
    expect(mocks.removeDraft).not.toHaveBeenCalled();
    await commitDraft(d, signal(), () => {});
    await commitDraft(d, signal(), () => {});
    expect(uploads).toBe(1);
    expect(commits).toBe(2);
    expect(d.stage).toBe("completed");
  });
  it("reports reservation constraints with operation, HTTP status and SQLSTATE only", async () => {
    mocks.fetch.mockImplementation(async (url: string) => {
      if (url.includes("/import_items?")) return Response.json([]);
      if (url.endsWith("/reserve_activity_file"))
        return Response.json(
          {
            code: "23514",
            message: "synthetic user path and metrics",
            details: "private details",
          },
          { status: 400 },
        );
      return Response.json({});
    });
    const failure = await commitDraft(draft(), signal(), () => {}).catch(
      (e: unknown) => e,
    );
    expect(importError(failure)).toContain("Réservation du fichier");
    expect(importError(failure)).toContain("23514");
    expect(importError(failure)).toContain("HTTP 400");
    expect(JSON.stringify(failure)).not.toContain("private details");
  });
  it("keeps known business errors and session failures actionable", () => {
    expect(
      importError(
        requestFailure(
          "reserve_activity_file",
          { message: "SOURCE_QUOTA_EXCEEDED", code: "P0001" },
          400,
        ),
      ),
    ).toContain("plafond technique");
    expect(
      importError(
        requestFailure(
          "source.info",
          { message: "private auth response" },
          401,
        ),
      ),
    ).toContain("Reconnecte-toi");
  });
});
