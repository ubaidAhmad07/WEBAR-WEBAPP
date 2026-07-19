"use client";

import { useState } from "react";
import Link from "next/link";
import type { PublicMenu } from "@/lib/menu";
import { formatPrice } from "@/lib/tags";
import TagPill from "@/components/TagPill";

export default function MenuHome({ menu }: { menu: PublicMenu }) {
  const withItems = menu.categories;
  const [selectedId, setSelectedId] = useState<number | null>(
    withItems[0]?.id ?? null,
  );
  const selected = withItems.find((c) => c.id === selectedId) ?? withItems[0];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-1 flex-col bg-cream">
      {/* Header */}
      <div className="relative flex items-center gap-3 px-5 pb-3.5 pt-[22px]">
        <div className="pointer-events-none absolute left-2.5 top-3 h-14 w-14 rounded-full bg-peach" />
        <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-terra font-display text-[19px] text-white">
          {menu.restaurantName.charAt(0).toUpperCase() || "R"}
        </div>
        <div className="relative flex flex-col">
          <h1 className="font-display text-[21px] leading-tight text-ink">
            {menu.restaurantName}
          </h1>
          <span className="font-sans text-xs text-faint">
            Digital menu · AR enabled
          </span>
        </div>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto px-5 pb-3.5 pt-2 [scrollbar-width:none]">
        {withItems.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedId(cat.id)}
            className={
              cat.id === selected?.id
                ? "shrink-0 cursor-pointer rounded-full bg-terra px-[15px] py-[7px] font-sans text-[12.5px] font-semibold text-white"
                : "shrink-0 cursor-pointer rounded-full border border-[rgba(32,30,29,0.2)] px-[15px] py-[7px] font-sans text-[12.5px] font-medium text-muted transition-colors hover:bg-card"
            }
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Item cards */}
      <div className="flex flex-1 flex-col gap-4 px-5 pb-4 pt-0.5">
        {selected?.items.map((item) => (
          <Link
            key={item.id}
            href={`/item/${item.id}`}
            className="overflow-hidden rounded-panel bg-card shadow-soft transition-shadow hover:shadow-lift"
          >
            <div className="relative h-[168px]">
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
              {item.hasModel && (
                <span className="absolute right-3 top-3 rounded-full bg-terra px-[11px] py-[5px] font-sans text-[11px] font-bold tracking-wide text-white">
                  AR
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2 px-4 pb-4 pt-3.5">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-[17px] text-ink">{item.name}</span>
                <span className="font-sans text-[15px] font-bold text-rust">
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
            </div>
          </Link>
        ))}
        {(!selected || selected.items.length === 0) && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16">
            <span className="font-display text-lg text-ink">Nothing here yet</span>
            <span className="font-sans text-[13px] text-muted">
              This category is still being filled.
            </span>
          </div>
        )}
      </div>

      <footer className="p-2.5 text-center font-sans text-[10.5px] font-medium tracking-wider text-fainter">
        Powered by AR Menu
      </footer>
    </main>
  );
}
