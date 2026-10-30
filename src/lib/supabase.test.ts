import { describe, expect, it } from "vitest";
import {
  assertPublicBuildConfig,
  publicBuildCommit,
  publicBuildDiagnostics,
  validatePublicConfig,
} from "./supabase-config";
const url = "https://example.supabase.co";
const jwt = (role: string) =>
  `header.${btoa(JSON.stringify({ role }))}.signature`;
describe("public-only Supabase config", () => {
  it("accepts public publishable and legacy anon keys", () => {
    expect(validatePublicConfig(url, "sb_publishable_example")).not.toBeNull();
    expect(validatePublicConfig(url, jwt("anon"))).not.toBeNull();
  });
  it("rejects management, secret and service-role keys", () => {
    for (const key of [
      "sb_secret_example",
      "sbp_management",
      jwt("service_role"),
    ])
      expect(validatePublicConfig(url, key)).toBeNull();
  });
  it("rejects remote plaintext and missing config", () => {
    expect(
      validatePublicConfig("http://example.com", "sb_publishable_example"),
    ).toBeNull();
    expect(validatePublicConfig(undefined, undefined)).toBeNull();
  });
});

describe("safe build diagnostics", () => {
  it("reports presence and validity without exposing values", () => {
    const env = {
      VITE_SUPABASE_URL: url,
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_public_key",
      UNRELATED_SECRET: "synthetic-server-only-value",
    };
    const diagnostics = publicBuildDiagnostics(env);
    expect(diagnostics).toEqual({
      VITE_SUPABASE_URL: "present",
      VITE_SUPABASE_PUBLISHABLE_KEY: "present",
      supabasePublicConfig: "valid",
    });
    for (const value of Object.values(env))
      expect(JSON.stringify(diagnostics)).not.toContain(value);
    expect(() => assertPublicBuildConfig(env, true)).not.toThrow();
  });
  it("blocks missing Cloudflare configuration but keeps the local demo", () => {
    expect(publicBuildDiagnostics({}).supabasePublicConfig).toBe("invalid");
    expect(() => assertPublicBuildConfig({}, true)).toThrow("Build interrompu");
    expect(() => assertPublicBuildConfig({}, false)).not.toThrow();
    expect(() =>
      assertPublicBuildConfig({ VITE_SUPABASE_URL: url }, true),
    ).toThrow("Build interrompu");
  });
  it("blocks invalid or privileged keys in every build without echoing them", () => {
    for (const key of [
      "sb_secret_synthetic",
      jwt("service_role"),
      "synthetic-malformed-api-key",
    ])
      for (const workersCI of [true, false]) {
        try {
          assertPublicBuildConfig(
            { VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key },
            workersCI,
          );
          expect.fail("An invalid key must stop the build");
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain("Build interrompu");
          expect((error as Error).message).not.toContain(key);
        }
      }
  });
  it("only publishes a full commit SHA from the build context", () => {
    const sha = "a".repeat(40);
    expect(publicBuildCommit({ WORKERS_CI_COMMIT_SHA: sha })).toBe(sha);
    expect(publicBuildCommit({ GITHUB_SHA: sha })).toBe(sha);
    expect(
      publicBuildCommit({ WORKERS_CI_COMMIT_SHA: "arbitrary-value" }),
    ).toBeNull();
    expect(publicBuildCommit({})).toBeNull();
  });
});
