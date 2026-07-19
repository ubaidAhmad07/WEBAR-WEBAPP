import { asc, eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { storage } from "@/lib/storage";
import { parseTags } from "@/lib/tags";

export type PublicItem = {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  tags: string[];
  coverPhotoUrl: string | null;
  hasModel: boolean;
};

export type PublicCategory = {
  id: number;
  name: string;
  items: PublicItem[];
};

export type PublicMenu = {
  restaurantName: string;
  categories: PublicCategory[];
};

export function getPublicMenu(): PublicMenu {
  const settings = db
    .select()
    .from(tables.settings)
    .where(eq(tables.settings.id, 1))
    .get();
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
  const readyModels = new Set(
    db
      .select()
      .from(tables.itemModels)
      .where(eq(tables.itemModels.status, "ready"))
      .all()
      .map((m) => m.itemId),
  );

  return {
    restaurantName: settings?.restaurantName ?? "Restaurant",
    categories: categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      items: items
        .filter((i) => i.categoryId === cat.id)
        .map((i) => ({
          id: i.id,
          name: i.name,
          description: i.description,
          priceCents: i.priceCents,
          tags: parseTags(i.tags),
          coverPhotoUrl: i.coverPhotoKey ? storage.url(i.coverPhotoKey) : null,
          hasModel: readyModels.has(i.id),
        })),
    })),
  };
}

export function getPublicItem(id: number): (PublicItem & { categoryId: number; categoryName: string }) | null {
  const item = db
    .select()
    .from(tables.menuItems)
    .where(eq(tables.menuItems.id, id))
    .get();
  if (!item) return null;
  const category = db
    .select()
    .from(tables.categories)
    .where(eq(tables.categories.id, item.categoryId))
    .get();
  const model = db
    .select()
    .from(tables.itemModels)
    .where(eq(tables.itemModels.itemId, id))
    .get();
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    priceCents: item.priceCents,
    tags: parseTags(item.tags),
    coverPhotoUrl: item.coverPhotoKey ? storage.url(item.coverPhotoKey) : null,
    hasModel: model?.status === "ready",
    categoryId: item.categoryId,
    categoryName: category?.name ?? "Menu",
  };
}

/** Model + marker data for the AR / 3D viewer pages. */
export function getViewerData(itemId: number) {
  const item = getPublicItem(itemId);
  if (!item) return null;
  const model = db
    .select()
    .from(tables.itemModels)
    .where(eq(tables.itemModels.itemId, itemId))
    .get();
  const settings = db
    .select()
    .from(tables.settings)
    .where(eq(tables.settings.id, 1))
    .get();
  return {
    item,
    modelUrl:
      model?.status === "ready" && model.compressedKey
        ? storage.url(model.compressedKey)
        : null,
    mindTargetUrl: settings?.mindTargetKey ? storage.url(settings.mindTargetKey) : null,
  };
}
