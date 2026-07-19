import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { storage } from "@/lib/storage";
import { parseTags } from "@/lib/tags";
import { getModelForItem } from "@/lib/models";
import ItemEditor from "@/components/admin/ItemEditor";
import type { ModelInfo } from "@/components/admin/GlbUploadWidget";

export const dynamic = "force-dynamic";

export default async function EditItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const id = Number((await params).id);
  const item = db
    .select()
    .from(tables.menuItems)
    .where(eq(tables.menuItems.id, id))
    .get();
  if (!item) notFound();

  const category = db
    .select()
    .from(tables.categories)
    .where(eq(tables.categories.id, item.categoryId))
    .get();
  const model = getModelForItem(id);
  const modelInfo: ModelInfo = model
    ? {
        status: model.status,
        url: model.compressedKey ? storage.url(model.compressedKey) : null,
        originalBytes: model.originalBytes,
        compressedBytes: model.compressedBytes,
        errorMessage: model.errorMessage,
      }
    : { status: "none" };

  const isNew = (await searchParams).new === "1";

  return (
    <ItemEditor
      item={{
        id: item.id,
        name: item.name,
        description: item.description,
        priceCents: item.priceCents,
        tags: parseTags(item.tags),
        coverPhotoUrl: item.coverPhotoKey ? storage.url(item.coverPhotoKey) : null,
      }}
      categoryName={category?.name ?? "Menu"}
      isNew={isNew}
      model={modelInfo}
    />
  );
}
