import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { ImportPage } from "./import-page";
it("sélectionne puis efface les fichiers sans simuler une analyse", async () => {
  render(<ImportPage />);
  const user = userEvent.setup();
  await user.upload(
    screen.getByLabelText("Fichiers sportifs"),
    new File(["sample"], "run.gpx", { type: "application/gpx+xml" }),
  );
  expect(screen.getByText("run.gpx")).toBeVisible();
  expect(
    screen.getByRole("button", {
      name: "Analyse disponible dans une prochaine étape",
    }),
  ).toBeDisabled();
  await user.click(
    screen.getByRole("button", { name: "Effacer la sélection" }),
  );
  expect(screen.queryByText("run.gpx")).not.toBeInTheDocument();
});
