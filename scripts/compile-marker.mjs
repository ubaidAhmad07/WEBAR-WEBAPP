/**
 * Compile a QR code image into a MindAR image target (.mind file).
 * Runs as a child process so tfjs/canvas never enter the Next.js bundle.
 *
 * Usage: node scripts/compile-marker.mjs <input.png> <output.mind>
 * Emits "PROGRESS <percent>" lines on stdout, then "DONE".
 */
import fs from "node:fs";
import { loadImage } from "canvas";
import { OfflineCompiler } from "mind-ar/src/image-target/offline-compiler.js";

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error("Usage: node compile-marker.mjs <input.png> <output.mind>");
  process.exit(2);
}

const img = await loadImage(inputPath);
const compiler = new OfflineCompiler();
let lastReported = -1;
await compiler.compileImageTargets([img], (progress) => {
  const pct = Math.floor(progress);
  if (pct > lastReported) {
    lastReported = pct;
    console.log(`PROGRESS ${pct}`);
  }
});
const buffer = compiler.exportData();
fs.writeFileSync(outputPath, Buffer.from(buffer));
console.log("DONE");
process.exit(0);
