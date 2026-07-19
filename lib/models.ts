import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { storage } from "@/lib/storage";
import { compressGlb } from "@/lib/compress";
import type { ItemModel } from "@/lib/db/schema";

export function getModelForItem(itemId: number): ItemModel | undefined {
  return db
    .select()
    .from(tables.itemModels)
    .where(eq(tables.itemModels.itemId, itemId))
    .get();
}

/** Delete any stored files for an item's model, then the row itself. */
export async function deleteModelForItem(itemId: number): Promise<void> {
  const model = getModelForItem(itemId);
  if (!model) return;
  for (const key of [model.originalKey, model.compressedKey]) {
    if (key) await storage.delete(key);
  }
  db.delete(tables.itemModels).where(eq(tables.itemModels.itemId, itemId)).run();
}

/**
 * Store the uploaded original, mark the row "compressing", and kick off
 * compression in-process (fire-and-forget — the client polls for status).
 */
export async function startModelCompression(
  itemId: number,
  original: Buffer,
): Promise<void> {
  const previous = getModelForItem(itemId);
  const ts = Date.now();
  const originalKey = `models/item-${itemId}-${ts}-original.glb`;
  await storage.put(originalKey, original);

  db.insert(tables.itemModels)
    .values({
      itemId,
      originalKey,
      compressedKey: null,
      status: "compressing",
      originalBytes: original.length,
      compressedBytes: null,
      errorMessage: null,
      updatedAt: ts,
    })
    .onConflictDoUpdate({
      target: tables.itemModels.itemId,
      set: {
        originalKey,
        compressedKey: null,
        status: "compressing",
        originalBytes: original.length,
        compressedBytes: null,
        errorMessage: null,
        updatedAt: ts,
      },
    })
    .run();

  // Clean up files from a previous upload for this item.
  if (previous) {
    for (const key of [previous.originalKey, previous.compressedKey]) {
      if (key && key !== originalKey) await storage.delete(key);
    }
  }

  void (async () => {
    try {
      const compressed = await compressGlb(original);
      const compressedKey = `models/item-${itemId}-${ts}.glb`;
      await storage.put(compressedKey, compressed);
      db.update(tables.itemModels)
        .set({
          compressedKey,
          compressedBytes: compressed.length,
          status: "ready",
          errorMessage: null,
          updatedAt: Date.now(),
        })
        .where(eq(tables.itemModels.itemId, itemId))
        .run();
    } catch (err) {
      console.error(`Compression failed for item ${itemId}:`, err);
      db.update(tables.itemModels)
        .set({
          status: "error",
          errorMessage: err instanceof Error ? err.message : String(err),
          updatedAt: Date.now(),
        })
        .where(eq(tables.itemModels.itemId, itemId))
        .run();
    }
  })();
}
