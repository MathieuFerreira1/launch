import { describe, expect, it } from "vitest";
import { inventoryFiles } from "./selection";
describe("inventaire local de fichiers", () => {
  it("conserve les fichiers inconnus pour les signaler et refuse les fichiers vides", () => {
    expect(
      inventoryFiles([
        { name: "sortie.GPX", size: 20 },
        { name: "export.fit.gz", size: 80 },
        { name: "archive.zip", size: 0 },
      ]),
    ).toEqual([
      { name: "sortie.GPX", size: 20, supportedExtension: true },
      { name: "export.fit.gz", size: 80, supportedExtension: false },
      { name: "archive.zip", size: 0, supportedExtension: false },
    ]);
  });
});
