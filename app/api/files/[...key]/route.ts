import { NextRequest } from "next/server";
import { storage } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  ".glb": "model/gltf-binary",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mind": "application/octet-stream",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const joined = key.join("/");
  const ext = joined.slice(joined.lastIndexOf(".")).toLowerCase();
  try {
    const buf = await storage.read(joined);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
