import { openDB } from "idb";
import type {
  LocalImport,
  ImportCandidate,
  ImportIssue,
  SourceFile,
} from "./model";
type Meta = Omit<LocalImport, "items" | "issues">;
let connection: ReturnType<typeof openDB> | undefined;
const db = () =>
  (connection ??= openDB("launch-private-imports", 1, {
    upgrade(d) {
      d.createObjectStore("drafts", { keyPath: "id" });
      d.createObjectStore("entries", { keyPath: ["draft", "key"] });
      d.createObjectStore("issues", { keyPath: ["draft", "key"] });
      d.createObjectStore("sources", { keyPath: ["draft", "hash"] });
    },
  }));
export async function createDraft(owner: string): Promise<LocalImport> {
  const state: LocalImport = {
    id: crypto.randomUUID(),
    owner,
    createdAt: Date.now(),
    stage: "analysing",
    items: [],
    issues: [],
    retainSources: false,
    analysedBytes: 0,
  };
  await updateMeta(state);
  return state;
}
export async function updateMeta(state: LocalImport) {
  const { items, issues, ...meta } = state;
  void items;
  void issues;
  await (await db()).put("drafts", meta);
}
export async function persistFile(
  draft: string,
  source: SourceFile,
  items: ImportCandidate[],
) {
  const d = await db();
  const tx = d.transaction(["entries", "sources"], "readwrite");
  await tx.objectStore("sources").put({ ...source, draft });
  for (const item of items)
    await tx.objectStore("entries").put({ ...item, draft });
  await tx.done;
}
export async function persistIssue(draft: string, issue: ImportIssue) {
  await (await db()).put("issues", { ...issue, draft });
}
export async function persistItem(draft: string, item: ImportCandidate) {
  await (await db()).put("entries", { ...item, draft });
}
export async function getSource(
  draft: string,
  hash: string,
): Promise<SourceFile | undefined> {
  return (await db()).get("sources", [draft, hash]);
}
export async function removeDraft(id: string) {
  const d = await db();
  const tx = d.transaction(
    ["drafts", "entries", "issues", "sources"],
    "readwrite",
  );
  await tx.objectStore("drafts").delete(id);
  for (const name of ["entries", "issues", "sources"] as const) {
    const store = tx.objectStore(name);
    let cursor = await store.openCursor(
      IDBKeyRange.bound([id, ""], [id, "\uffff"]),
    );
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
  }
  await tx.done;
}
export async function loadDrafts(owner: string): Promise<LocalImport[]> {
  const d = await db();
  const metas: Meta[] = await d.getAll("drafts");
  const result: LocalImport[] = [];
  for (const m of metas) {
    if (m.owner !== owner || Date.now() - m.createdAt > 48 * 3600 * 1000) {
      await removeDraft(m.id);
      continue;
    }
    const range = IDBKeyRange.bound([m.id, ""], [m.id, "\uffff"]);
    result.push({
      ...m,
      items: await d.getAll("entries", range),
      issues: await d.getAll("issues", range),
    });
  }
  return result.sort((a, b) => b.createdAt - a.createdAt);
}

export async function clearOwnedDrafts(owner: string) {
  const d = await db();
  const metas: Meta[] = await d.getAll("drafts");
  for (const m of metas) if (m.owner === owner) await removeDraft(m.id);
}

export async function persistItems(draft: string, items: ImportCandidate[]) {
  const tx = (await db()).transaction("entries", "readwrite");
  await Promise.all(items.map((item) => tx.store.put({ ...item, draft })));
  await tx.done;
}
