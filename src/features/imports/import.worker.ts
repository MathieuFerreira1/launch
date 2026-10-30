import { analyzeFiles } from "./analyze";
import type { WorkerEvent } from "./model";
const worker = self as unknown as {
  postMessage: (event: WorkerEvent, transfer?: Transferable[]) => void;
  onmessage: ((e: MessageEvent) => void) | null;
};
let acknowledge: (() => void) | undefined;
worker.onmessage = async (
  e: MessageEvent<{ type: "analyze"; files: File[] } | { type: "ack" }>,
) => {
  if (e.data.type === "ack") {
    acknowledge?.();
    return;
  }
  try {
    await analyzeFiles(
      e.data.files,
      async (output) => {
        await new Promise<void>((resolve) => {
          acknowledge = resolve;
          worker.postMessage(
            output,
            output.type === "file" ? [output.file.bytes] : [],
          );
        });
      },
      (done, total, bytes) =>
        worker.postMessage({ type: "progress", done, total, bytes }),
    );
    worker.postMessage({ type: "done" });
  } catch (error) {
    worker.postMessage({
      type: "fatal",
      code:
        error instanceof Error && /^[A-Z_]+$/.test(error.message)
          ? error.message
          : "ANALYSE_INTERROMPUE",
    });
  }
};
