import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { ids } = await req.json().catch(() => ({}));
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "number")) {
    return Response.json({ error: "ids must be a number array" }, { status: 400 });
  }
  db.transaction((tx) => {
    ids.forEach((id: number, index: number) => {
      tx.update(tables.categories)
        .set({ sortOrder: index })
        .where(eq(tables.categories.id, id))
        .run();
    });
  });
  return Response.json({ ok: true });
}
