import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { storage } from "@/lib/storage";
import { looksLikeGlb, MAX_GLB_BYTES } from "@/lib/compress";
import {
  deleteModelForItem,
  getModelForItem,
  startModelCompression,
} from "@/lib/models";

function serialize(model: NonNullable<ReturnType<typeof getModelForItem>>) {
  return {
    status: model.status,
    originalBytes: model.originalBytes,
    compressedBytes: model.compressedBytes,
    errorMessage: model.errorMessage,
    url: model.compressedKey ? storage.url(model.compressedKey) : null,
    updatedAt: model.updatedAt,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const itemId = Number((await params).itemId);
  const model = getModelForItem(itemId);
  if (!model) return Response.json({ status: "none" });
  return Response.json(serialize(model));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const itemId = Number((await params).itemId);
  const item = db
    .select()
    .from(tables.menuItems)
    .where(eq(tables.menuItems.id, itemId))
    .get();
  if (!item) return Response.json({ error: "Item not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "file is required" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".glb")) {
    return Response.json(
      { error: "Wrong format — only .glb files are supported." },
      { status: 400 },
    );
  }
  if (file.size > MAX_GLB_BYTES) {
    return Response.json(
      { error: "File is too large — 100 MB max before compression." },
      { status: 400 },
    );
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (!looksLikeGlb(buf)) {
    return Response.json(
      { error: "Wrong format — this file is not a binary glTF (.glb)." },
      { status: 400 },
    );
  }

  await startModelCompression(itemId, buf);
  return Response.json({ status: "compressing" });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const itemId = Number((await params).itemId);
  await deleteModelForItem(itemId);
  return Response.json({ ok: true });
}
