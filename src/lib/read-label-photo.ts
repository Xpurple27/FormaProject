import { resizePhoto } from "./browser-photo";
import { parseNutritionLabel } from "./nutrition-label";

const ASSETS = "/ocr/v1";

export async function readLabelPhoto(file: File, signal: AbortSignal) {
  const [{ createWorker, OEM, PSM }, image] = await Promise.all([import("tesseract.js"), resizePhoto(file, 1600, .92)]);
  signal.throwIfAborted();

  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  let rejectScan: (reason: unknown) => void = () => {};
  const interrupted = new Promise<never>((_, reject) => { rejectScan = reject; });
  const abort = () => rejectScan(signal.reason);
  signal.addEventListener("abort", abort, { once: true });

  try {
    const recognizing = (async () => {
      worker = await createWorker("ind", OEM.LSTM_ONLY, {
        corePath: ASSETS,
        langPath: ASSETS,
        workerPath: ASSETS + "/worker.min.js",
        workerBlobURL: false,
        cachePath: "forma-ocr-v1",
        errorHandler: rejectScan,
      });
      if (signal.aborted) {
        await worker.terminate();
        signal.throwIfAborted();
      }
      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
      return (await worker.recognize(image)).data.text;
    })();
    return parseNutritionLabel(await Promise.race([recognizing, interrupted]));
  } finally {
    signal.removeEventListener("abort", abort);
    await worker?.terminate();
  }
}
