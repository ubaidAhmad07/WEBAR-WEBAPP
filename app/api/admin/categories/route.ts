import { sql } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { name } = await req.json().catch(() => ({}));
  if (typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }
  const max = db
    .select({ max: sql<number>`coalesce(max(${tables.categories.sortOrder}), -1)` })
    .from(tables.categories)
    .get();
  const row = db
    .insert(tables.categories)
    .values({ name: name.trim(), sortOrder: (max?.max ?? -1) + 1 })
    .returning()
    .get();
  return Response.json(row);
}
