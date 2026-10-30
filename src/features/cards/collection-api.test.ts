import { describe, expect, it } from "vitest";
import { parseCollectionData, ruleCondition } from "./collection-api";
import { rewardFixture, runningCards } from "../../../tests/fixtures/rewards";
describe("server collection presentation", () => {
  it("uses configurable rules, exact SI values and separate completion cards", () => {
    const data = parseCollectionData(rewardFixture(runningCards));
    expect(data.cards).toHaveLength(28);
    expect(data.cards.filter((c) => c.kind === "completion")).toHaveLength(4);
    expect(
      data.cards.find((c) => c.id === "RUN_MARATHON")?.condition,
    ).toContain("42,195 km");
    expect(
      data.cards.find((c) => c.id === "TRAIL_UP_500")?.condition,
    ).toContain("500 m D+");
    expect(
      data.cards.find((c) => c.id === "RUN_COMPLETE")?.condition,
    ).toContain("6 jalons");
    expect(data.cards.filter((c) => c.owned)).toHaveLength(7);
  });
  it("does not invent ownership or metrics when the backend response is missing", () => {
    expect(
      parseCollectionData(rewardFixture()).cards.every((c) => !c.owned),
    ).toBe(true);
    expect(() => parseCollectionData({})).toThrow(
      "COLLECTION_RESPONSE_INVALID",
    );
    expect(
      ruleCondition({
        card_id: "synthetic",
        metric: "distance_m",
        threshold: 500,
      }),
    ).toBe("Atteindre 500 m en une seule activité");
  });
});
