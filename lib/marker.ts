import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { db, tables } from "@/lib/db";
import { storage } from "@/lib/storage";

export type MarkerJob = {
  running: boolean;
  progress: number;
  error: string | null;
};

// Survives dev hot-reloads; single-process Node server per plan.
const globalForMarker = globalThis as unknown as { __markerJob?: MarkerJob };
const job: MarkerJob = (globalForMarker.__markerJob ??= {
  running: false,
  progress: 0,
  error: null,
});

export function getMarkerJob(): MarkerJob {
  return job;
}

/**
 * Generate the QR png for `menuUrl` (single source of truth — the same file
 * is printed AND compiled) and kick off .mind compilation in a child process.
 */
export async function startMarkerGeneration(menuUrl: string): Promise<void> {
  if (job.running) throw new Error("A marker compilation is already running");

  const png = await QRCode.toBuffer(menuUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 600,
    color: { dark: "#201e1d", light: "#ffffff" },
  });
  await storage.put("qr/qr.png", png);

  // Marker is stale until compilation finishes.
  db.insert(tables.settings)
    .values({ id: 1, menuUrl, qrPngKey: "qr/qr.png", mindTargetKey: null })
    .onConflictDoUpdate({
      target: tables.settings.id,
      set: { menuUrl, qrPngKey: "qr/qr.png", mindTargetKey: null },
    })
    .run();

  const tmpDir = path.join(process.cwd(), "data", "tmp");
  await fs.mkdir(tmpDir, { recursive: true });
  const inputPath = path.join(tmpDir, "qr-input.png");
  const outputPath = path.join(tmpDir, "targets.mind");
  await fs.writeFile(inputPath, png);

  job.running = true;
  job.progress = 0;
  job.error = null;

  const child = spawn(
    process.execPath,
    [path.join(process.cwd(), "scripts", "compile-marker.mjs"), inputPath, outputPath],
    { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
  );

  let stderr = "";
  child.stderr.on("data", (d) => (stderr += String(d)));
  child.stdout.on("data", (d) => {
    for (const line of String(d).split(/\r?\n/)) {
      const match = /^PROGRESS (\d+)/.exec(line);
      if (match) job.progress = Number(match[1]);
    }
  });

  child.on("close", async (code) => {
    try {
      if (code !== 0) {
        throw new Error(stderr.trim() || `Compiler exited with code ${code}`);
      }
      const mind = await fs.readFile(outputPath);
      await storage.put("qr/targets.mind", mind);
      db.update(tables.settings)
        .set({ mindTargetKey: "qr/targets.mind" })
        .run();
      job.progress = 100;
    } catch (err) {
      job.error = err instanceof Error ? err.message : String(err);
      console.error("Marker compilation failed:", err);
    } finally {
      job.running = false;
      await fs.rm(inputPath, { force: true });
      await fs.rm(outputPath, { force: true });
    }
  });
}
