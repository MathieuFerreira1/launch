export interface SelectedFile {
  name: string;
  size: number;
  supportedExtension: boolean;
}
// Inventory only. This is deliberately not content validation, extraction or parsing.
export function inventoryFiles(
  files: Pick<File, "name" | "size">[],
): SelectedFile[] {
  return files.map((f) => ({
    name: f.name,
    size: f.size,
    supportedExtension: /\.(fit|gpx|tcx|zip)$/i.test(f.name) && f.size > 0,
  }));
}
