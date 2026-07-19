import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { storage } from "@/lib/storage";
import { getMarkerJob } from "@/lib/marker";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const job = getMarkerJob();
  const settings = db
    .select()
    .from(tables.settings)
    .where(eq(tables.settings.id, 1))
    .get();
  return Response.json({
    running: job.running,
    progress: job.progress,
    error: job.error,
    menuUrl: settings?.menuUrl ?? null,
    qrUrl: settings?.qrPngKey ? storage.url(settings.qrPngKey) : null,
    hasMarker: Boolean(settings?.mindTargetKey),
  });
}
