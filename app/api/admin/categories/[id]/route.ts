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
  const { name } = await req.json().catch(() => ({}));
  if (typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }
  const row = db
    .update(tables.categories)
    .set({ name: name.trim() })
    .where(eq(tables.categories.id, id))
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
  const items = db
    .select()
    .from(tables.menuItems)
    .where(eq(tables.menuItems.categoryId, id))
    .all();
  for (const item of items) {
    await deleteModelForItem(item.id);
    if (item.coverPhotoKey) await storage.delete(item.coverPhotoKey);
  }
  db.delete(tables.categories).where(eq(tables.categories.id, id)).run();
  return Response.json({ ok: true });
}
