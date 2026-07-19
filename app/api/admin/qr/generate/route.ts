import { requireAdmin } from "@/lib/session";
import { startMarkerGeneration } from "@/lib/marker";

export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { menuUrl } = await req.json().catch(() => ({}));
  if (typeof menuUrl !== "string" || !/^https?:\/\/.+/.test(menuUrl.trim())) {
    return Response.json(
      { error: "menuUrl must be a valid http(s) URL" },
      { status: 400 },
    );
  }
  try {
    await startMarkerGeneration(menuUrl.trim());
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to start" },
      { status: 409 },
    );
  }
  return Response.json({ ok: true });
}
