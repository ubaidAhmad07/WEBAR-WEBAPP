import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Single-restaurant app: one settings row (id = 1).
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  restaurantName: text("restaurant_name").notNull().default("Restaurant Name"),
  menuUrl: text("menu_url"),
  qrPngKey: text("qr_png_key"),
  mindTargetKey: text("mind_target_key"),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const menuItems = sqliteTable("menu_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  priceCents: integer("price_cents").notNull().default(0),
  // JSON-encoded string[] — portable between SQLite and Postgres.
  tags: text("tags").notNull().default("[]"),
  coverPhotoKey: text("cover_photo_key"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export type ModelStatus = "compressing" | "ready" | "error";

export const itemModels = sqliteTable("item_models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .unique()
    .references(() => menuItems.id, { onDelete: "cascade" }),
  originalKey: text("original_key"),
  compressedKey: text("compressed_key"),
  status: text("status").$type<ModelStatus>().notNull(),
  originalBytes: integer("original_bytes"),
  compressedBytes: integer("compressed_bytes"),
  errorMessage: text("error_message"),
  updatedAt: integer("updated_at").notNull(),
});

export type Settings = typeof settings.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type ItemModel = typeof itemModels.$inferSelect;
