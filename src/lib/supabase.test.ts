import { describe, expect, it } from "vitest";
import { validatePublicConfig } from "./supabase";
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
