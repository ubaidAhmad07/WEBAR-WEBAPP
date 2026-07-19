import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicItem } from "@/lib/menu";
import { formatPrice } from "@/lib/tags";
import TagPill from "@/components/TagPill";

export const dynamic = "force-dynamic";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  const item = getPublicItem(id);
  if (!item) notFound();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-1 flex-col bg-cream">
      <div className="flex items-center gap-2.5 px-5 pb-2.5 pt-[18px]">
        <Link
          href="/"
          aria-label="Back to menu"
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
        <span className="font-sans text-[13px] font-semibold text-faint">
          {item.categoryName}
        </span>
      </div>

      <div className="mx-5 mt-1.5 h-[250px] overflow-hidden rounded-panel">
        {item.coverPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverPhotoUrl}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="stripe h-full w-full" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-2xl leading-tight text-ink">{item.name}</h1>
          <span className="font-sans text-[19px] font-bold text-rust">
            {formatPrice(item.priceCents)}
          </span>
        </div>
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <TagPill key={tag} tag={tag} size="md" />
            ))}
          </div>
        )}
        {item.description && (
          <p className="font-sans text-sm leading-relaxed text-muted">
            {item.description}
          </p>
        )}
        {item.hasModel && (
          <div className="mt-1 inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sage" />
            <span className="font-sans text-xs font-semibold text-sage-text">
              3D model available
            </span>
          </div>
        )}
      </div>

      {item.hasModel && (
        <div className="flex flex-col gap-2.5 px-5 pb-[22px] pt-4">
          <Link
            href={`/ar/${item.id}`}
            className="rounded-full bg-terra py-3.5 text-center font-sans text-[15px] font-bold text-white shadow-lift transition-colors hover:bg-terra-deep"
          >
            View in AR
          </Link>
          <Link
            href={`/view/${item.id}`}
            className="text-center font-sans text-[13px] font-semibold text-rust hover:text-rust-deep"
          >
            View in 3D instead
          </Link>
        </div>
      )}
    </main>
  );
}
