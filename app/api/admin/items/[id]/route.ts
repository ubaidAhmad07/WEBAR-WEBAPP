import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { deleteModelForItem } from "@/lib/models";
import { storage } from "@/lib/storage";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const id = Number((await params).id);
  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
  if (typeof body.description === "string") updates.description = body.description;
  if (Number.isInteger(body.priceCents) && body.priceCents >= 0) {
    updates.priceCents = body.priceCents;
  }
  if (Array.isArray(body.tags)) {
    updates.tags = JSON.stringify(
      body.tags.filter((t: unknown) => typeof t === "string" && t.trim()),
    );
  }
  if (Number.isInteger(body.categoryId)) updates.categoryId = body.categoryId;
  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }
  const row = db
    .update(tables.menuItems)
    .set(updates)
    .where(eq(tables.menuItems.id, id))
    .returning()
    .get();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(row);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const id = Number((await params).id);
  const item = db
    .select()
    .from(tables.menuItems)
    .where(eq(tables.menuItems.id, id))
    .get();
  if (!item) return Response.json({ error: "Not found" }, { status: 404 });

  await deleteModelForItem(id);
  if (item.coverPhotoKey) await storage.delete(item.coverPhotoKey);
  db.delete(tables.menuItems).where(eq(tables.menuItems.id, id)).run();
  return Response.json({ ok: true });
}
