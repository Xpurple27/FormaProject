import { parseNutritionLabel } from "./nutrition-label";

const ASSETS = "/ocr/v1";

async function labelImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas unavailable");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error("Could not prepare image"));
    }, "image/jpeg", .92));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function readLabelPhoto(file: File, signal: AbortSignal) {
  const [{ createWorker, OEM, PSM }, image] = await Promise.all([import("tesseract.js"), labelImage(file)]);
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
