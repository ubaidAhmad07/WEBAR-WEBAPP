import { and, eq, sql } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => ({}));
  const categoryId = Number(body.categoryId);
  if (!Number.isInteger(categoryId)) {
    return Response.json({ error: "categoryId is required" }, { status: 400 });
  }
  const category = db
    .select()
    .from(tables.categories)
    .where(eq(tables.categories.id, categoryId))
    .get();
  if (!category) return Response.json({ error: "Category not found" }, { status: 404 });

  const max = db
    .select({ max: sql<number>`coalesce(max(${tables.menuItems.sortOrder}), -1)` })
    .from(tables.menuItems)
    .where(eq(tables.menuItems.categoryId, categoryId))
    .get();

  const row = db
    .insert(tables.menuItems)
    .values({
      categoryId,
      name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : "New item",
      description: typeof body.description === "string" ? body.description : "",
      priceCents: Number.isInteger(body.priceCents) ? body.priceCents : 0,
      tags: JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
      sortOrder: (max?.max ?? -1) + 1,
    })
    .returning()
    .get();
  return Response.json(row);
}

export async function PUT(req: Request) {
  // Reorder items within a category: { categoryId, ids }
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { categoryId, ids } = await req.json().catch(() => ({}));
  if (!Number.isInteger(categoryId) || !Array.isArray(ids)) {
    return Response.json({ error: "categoryId and ids are required" }, { status: 400 });
  }
  db.transaction((tx) => {
    ids.forEach((id: number, index: number) => {
      tx.update(tables.menuItems)
        .set({ sortOrder: index })
        .where(
          and(eq(tables.menuItems.id, id), eq(tables.menuItems.categoryId, categoryId)),
        )
        .run();
    });
  });
  return Response.json({ ok: true });
}
