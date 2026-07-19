import { eq } from "drizzle-orm";
import sharp from "sharp";
import { db, tables } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { storage } from "@/lib/storage";

const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const id = Number((await params).id);
  const item = db
    .select()
    .from(tables.menuItems)
    .where(eq(tables.menuItems.id, id))
    .get();
  if (!item) return Response.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "file is required" }, { status: 400 });
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return Response.json({ error: "Photo is too large (20 MB max)" }, { status: 400 });
  }

  let webp: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    webp = await sharp(input)
      .rotate() // respect EXIF orientation
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return Response.json({ error: "Not a valid image file" }, { status: 400 });
  }

  const key = `photos/item-${id}-${Date.now()}.webp`;
  await storage.put(key, webp);
  if (item.coverPhotoKey) await storage.delete(item.coverPhotoKey);

  db.update(tables.menuItems)
    .set({ coverPhotoKey: key })
    .where(eq(tables.menuItems.id, id))
    .run();
  return Response.json({ key, url: storage.url(key) });
}
