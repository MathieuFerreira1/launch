import { expect, it } from "vitest";
import { profileFieldsSchema } from "./profile";
it("normalizes an optional handle and refuses unsafe avatar URLs and oversized biography", () => {
  const fields = {
    handle: "  Athlete_1 ",
    display_name: " Alex ",
    avatar_url: "",
    bio: "",
  };
  expect(profileFieldsSchema.parse(fields).handle).toBe("athlete_1");
  expect(
    profileFieldsSchema.safeParse({
      ...fields,
      avatar_url: "javascript:alert(1)",
    }).success,
  ).toBe(false);
  expect(
    profileFieldsSchema.safeParse({ ...fields, bio: "a".repeat(501) }).success,
  ).toBe(false);
});
