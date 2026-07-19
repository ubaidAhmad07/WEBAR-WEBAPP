import { db, tables } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { storage } from "@/lib/storage";
import { eq } from "drizzle-orm";

/**
 * Save the generated QR (png) and its compiled MindAR target (.mind).
 * Both files use fixed keys so the AR page always loads the current marker.
 */
export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const form = await req.formData();
  const menuUrl = form.get("menuUrl");
  const qr = form.get("qr");
  const mind = form.get("mind");

  const updates: Record<string, unknown> = {};
  if (typeof menuUrl === "string" && menuUrl.trim()) updates.menuUrl = menuUrl.trim();
  if (qr instanceof File) {
    await storage.put("qr/qr.png", Buffer.from(await qr.arrayBuffer()));
    updates.qrPngKey = "qr/qr.png";
  }
  if (mind instanceof File) {
    await storage.put("qr/targets.mind", Buffer.from(await mind.arrayBuffer()));
    updates.mindTargetKey = "qr/targets.mind";
  }
  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "Nothing to save" }, { status: 400 });
  }

  db.insert(tables.settings)
    .values({ id: 1, ...updates })
    .onConflictDoUpdate({ target: tables.settings.id, set: updates })
    .run();

  const row = db.select().from(tables.settings).where(eq(tables.settings.id, 1)).get();
  return Response.json(row);
}
