import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewerData } from "@/lib/menu";
import { formatPrice } from "@/lib/tags";
import ARClient from "@/components/ar/ARClient";

export const dynamic = "force-dynamic";

export default async function ArPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  const data = getViewerData(id);
  if (!data) notFound();
  if (!data.modelUrl) redirect(`/item/${id}`);

  if (!data.mindTargetUrl) {
    // Admin hasn't compiled the AR marker yet — offer the 3D fallback.
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-ar-bg p-6">
        <div className="flex w-[300px] flex-col gap-3 rounded-panel bg-cream p-6 shadow-modal">
          <h1 className="font-display text-xl text-ink">AR isn&apos;t set up yet</h1>
          <p className="font-sans text-[13px] leading-relaxed text-muted">
            The restaurant hasn&apos;t published its AR marker yet. You can
            still see the dish in 3D — same rotation, no camera needed.
          </p>
          <Link
            href={`/view/${id}?reason=no-ar`}
            className="rounded-full bg-terra py-3 text-center font-sans text-sm font-bold text-white transition-colors hover:bg-terra-deep"
          >
            View in 3D
          </Link>
        </div>
      </main>
    );
  }

  return (
    <ARClient
      itemId={id}
      itemName={data.item.name}
      priceLabel={formatPrice(data.item.priceCents)}
      modelUrl={data.modelUrl}
      mindTargetUrl={data.mindTargetUrl}
    />
  );
}
