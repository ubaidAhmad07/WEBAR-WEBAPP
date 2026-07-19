import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewerData } from "@/lib/menu";
import { formatPrice } from "@/lib/tags";
import SpinViewerClient from "@/components/menu/SpinViewerClient";

export const dynamic = "force-dynamic";

export default async function View3DPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reason?: string }>;
}) {
  const id = Number((await params).id);
  const data = getViewerData(id);
  if (!data) notFound();
  if (!data.modelUrl) redirect(`/item/${id}`);
  const fromArFallback = (await searchParams).reason === "no-ar";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-1 flex-col bg-cream">
      <div className="flex items-center gap-2.5 px-5 py-[18px]">
        <Link
          href={`/item/${id}`}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card transition-colors hover:bg-card-hover"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#201e1d"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <span className="font-display text-[17px] text-ink">{data.item.name}</span>
        <span className="ml-auto font-sans text-[15px] font-bold text-rust">
          {formatPrice(data.item.priceCents)}
        </span>
      </div>

      <div className="stripe mx-5 h-[360px] overflow-hidden rounded-panel">
        <SpinViewerClient src={data.modelUrl} className="h-full w-full" />
      </div>

      <div className="flex flex-col gap-2.5 p-5">
        {fromArFallback && (
          <div className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sage" />
            <span className="font-sans text-xs font-semibold text-sage-text">
              AR unavailable on this device — showing 3D viewer
            </span>
          </div>
        )}
        <p className="font-sans text-[13px] leading-relaxed text-muted">
          Same constant-speed rotation as AR mode, so both modes read identically.
        </p>
      </div>

      <div className="mt-auto px-5 pb-6 pt-4">
        <Link
          href="/"
          className="block rounded-full border border-line-strong py-3 text-center font-sans text-sm font-bold text-ink transition-colors hover:bg-card"
        >
          Back to menu
        </Link>
      </div>
    </main>
  );
}
