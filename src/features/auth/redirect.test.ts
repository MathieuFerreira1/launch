import { expect, it } from "vitest";
import { safeReturnPath } from "./redirect";
it("refuses external and authentication return URLs", () => {
  for (const path of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/auth",
    "/auth/forgot-password",
    null,
  ])
    expect(safeReturnPath(path, "https://launch.test")).toBe("/app");
  expect(safeReturnPath("/profile?edit=1", "https://launch.test")).toBe(
    "/profile?edit=1",
  );
});
