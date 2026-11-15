import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const engine = dirname(require.resolve("tesseract.js/package.json"));
const core = dirname(createRequire(join(engine, "package.json")).resolve("tesseract.js-core/package.json"));
const data = dirname(require.resolve("@tesseract.js-data/ind/package.json"));
const destination = new URL("../public/ocr/v1/", import.meta.url);
await mkdir(destination, { recursive: true });

const files = {
  "worker.min.js": join(engine, "dist", "worker.min.js"),
  "worker.min.js.LICENSE.txt": join(engine, "dist", "worker.min.js.LICENSE.txt"),
  "ind.traineddata.gz": join(data, "4.0.0_best_int", "ind.traineddata.gz"),
  "LICENSE-tesseract.txt": join(engine, "LICENSE.md"),
  "LICENSE-tesseract-core.txt": join(core, "LICENSE"),
};
for (const variant of ["lstm", "simd-lstm", "relaxedsimd-lstm"]) {
  const name = `tesseract-core-${variant}.wasm.js`;
  files[name] = join(core, name);
}
await Promise.all(Object.entries(files).map(([name, path]) => copyFile(path, new URL(name, destination))));
