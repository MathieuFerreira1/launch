import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RevealStage } from "./reveal-stage";
import { cards } from "@/lib/demo";
describe("RevealStage", () => {
  it("ne montre aucun reveal pour zéro carte ou des cartes non possédées", () => {
    const { container } = render(
      <RevealStage
        session={{
          id: "empty",
          kind: "new_achievements",
          cards: cards.filter((c) => !c.owned),
        }}
        onComplete={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
  it("présente des cartes déjà acquises et permet de passer sans changer leur possession", async () => {
    const onComplete = vi.fn();
    const owned = cards.filter((c) => c.owned);
    const before = JSON.stringify(owned);
    render(
      <MemoryRouter>
        <RevealStage
          session={{ id: "session", kind: "initial_collection", cards: owned }}
          onComplete={onComplete}
        />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("link")).toHaveLength(3);
    await userEvent.click(
      screen.getByRole("button", { name: "Tout afficher" }),
    );
    expect(screen.getAllByRole("link")).toHaveLength(owned.length);
    await userEvent.click(screen.getByRole("button", { name: "Passer" }));
    expect(onComplete).toHaveBeenCalledWith("session");
    expect(JSON.stringify(owned)).toBe(before);
  });
});
