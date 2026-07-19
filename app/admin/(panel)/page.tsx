import { asc } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { storage } from "@/lib/storage";
import { parseTags } from "@/lib/tags";
import type { AdminCategory } from "@/lib/admin-types";
import MenuManager from "@/components/admin/MenuManager";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  const categories = db
    .select()
    .from(tables.categories)
    .orderBy(asc(tables.categories.sortOrder), asc(tables.categories.id))
    .all();
  const items = db
    .select()
    .from(tables.menuItems)
    .orderBy(asc(tables.menuItems.sortOrder), asc(tables.menuItems.id))
    .all();
  const models = db.select().from(tables.itemModels).all();
  const modelByItem = new Map(models.map((m) => [m.itemId, m]));

  const data: AdminCategory[] = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    items: items
      .filter((i) => i.categoryId === cat.id)
      .map((i) => ({
        id: i.id,
        name: i.name,
        priceCents: i.priceCents,
        tags: parseTags(i.tags),
        coverPhotoUrl: i.coverPhotoKey ? storage.url(i.coverPhotoKey) : null,
        modelStatus: modelByItem.get(i.id)?.status ?? "none",
      })),
  }));

  return <MenuManager initial={data} />;
}
