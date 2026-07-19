"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRESET_TAGS } from "@/lib/tags";
import CoverPhotoField from "@/components/admin/CoverPhotoField";
import GlbUploadWidget, { type ModelInfo } from "@/components/admin/GlbUploadWidget";

export type EditorItem = {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  tags: string[];
  coverPhotoUrl: string | null;
};

const inputClass =
  "w-full rounded-full border border-line bg-card px-4 py-3 font-sans text-sm text-ink placeholder:text-faint outline-none focus:border-terra";
const labelClass = "font-sans text-xs font-semibold text-muted";

export default function ItemEditor({
  item,
  categoryName,
  isNew,
  model,
}: {
  item: EditorItem;
  categoryName: string;
  isNew: boolean;
  model: ModelInfo;
}) {
  const router = useRouter();
  const [name, setName] = useState(isNew ? "" : item.name);
  const [description, setDescription] = useState(item.description);
  const [price, setPrice] = useState(
    item.priceCents ? (item.priceCents / 100).toFixed(2) : "",
  );
  const [tags, setTags] = useState<string[]>(item.tags);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [busy, setBusy] = useState(false);

  const customTags = tags.filter((t) => !(PRESET_TAGS as readonly string[]).includes(t));

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function addCustomTag() {
    const tag = customValue.trim();
    setCustomValue("");
    setAddingCustom(false);
    if (tag && !tags.includes(tag)) setTags((prev) => [...prev, tag]);
  }

  async function save() {
    setBusy(true);
    const priceCents = Math.max(0, Math.round(parseFloat(price || "0") * 100) || 0);
    await fetch(`/api/admin/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || "New item",
        description,
        priceCents,
        tags,
      }),
    });
    router.push("/admin");
    router.refresh();
  }

  async function cancel() {
    if (isNew) await fetch(`/api/admin/items/${item.id}`, { method: "DELETE" });
    router.push("/admin");
    router.refresh();
  }

  function tagPillClass(selected: boolean) {
    return selected
      ? "cursor-pointer rounded-full bg-sage px-4 py-2 font-sans text-[12.5px] font-bold text-white"
      : "cursor-pointer rounded-full border border-line-strong px-4 py-2 font-sans text-[12.5px] font-semibold text-muted transition-colors hover:bg-card-hover";
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-baseline gap-2.5 px-7 pb-2 pt-5">
        <Link
          href="/admin"
          className="font-sans text-[13px] font-semibold text-rust hover:text-rust-deep"
        >
          ← {categoryName}
        </Link>
        <h1 className="font-display text-[22px] text-ink">
          {isNew ? "Add item" : "Edit item"}
        </h1>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-8 px-7 py-4">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="item-name" className={labelClass}>
              Name
            </label>
            <input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Item name"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="item-desc" className={labelClass}>
              Description
            </label>
            <textarea
              id="item-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A couple of lines about the dish."
              className="h-[88px] w-full resize-none rounded-3xl border border-line bg-card px-4 py-3 font-sans text-sm text-ink placeholder:text-faint outline-none focus:border-terra"
            />
          </div>
          <div className="flex w-[200px] flex-col gap-1.5">
            <label htmlFor="item-price" className={labelClass}>
              Price
            </label>
            <div className="flex items-center gap-1 rounded-full border border-line bg-card px-4 py-3">
              <span className="font-sans text-sm text-muted">$</span>
              <input
                id="item-price"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0.00"
                inputMode="decimal"
                className="w-full bg-transparent font-sans text-sm text-ink placeholder:text-faint outline-none"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className={labelClass}>Tags</span>
            <div className="flex flex-wrap gap-2">
              {PRESET_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={
                    tags.includes(tag)
                      ? tag === "Spicy"
                        ? "cursor-pointer rounded-full bg-terra px-4 py-2 font-sans text-[12.5px] font-bold text-white"
                        : tagPillClass(true)
                      : tagPillClass(false)
                  }
                >
                  {tag}
                  {tags.includes(tag) ? " ✓" : ""}
                </button>
              ))}
              {customTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={tagPillClass(true)}
                  title="Click to remove"
                >
                  {tag} ✓
                </button>
              ))}
              {addingCustom ? (
                <input
                  autoFocus
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addCustomTag();
                    if (e.key === "Escape") setAddingCustom(false);
                  }}
                  onBlur={addCustomTag}
                  placeholder="Custom tag"
                  className="w-32 rounded-full border border-line bg-card px-4 py-2 font-sans text-[12.5px] text-ink outline-none focus:border-terra"
                />
              ) : (
                <button
                  onClick={() => setAddingCustom(true)}
                  className="cursor-pointer rounded-full border border-dashed border-line-dash px-4 py-2 font-sans text-[12.5px] font-semibold text-faint transition-colors hover:bg-card-hover"
                >
                  + Custom
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <CoverPhotoField itemId={item.id} initialUrl={item.coverPhotoUrl} />
          <div className="flex flex-col gap-3 rounded-card bg-card p-[18px]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-sage" />
              <span className="font-display text-base text-ink">3D model</span>
              <span className="ml-auto font-sans text-[11px] font-medium text-faint">
                .glb · auto-compressed after upload
              </span>
            </div>
            <GlbUploadWidget itemId={item.id} initial={model} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2.5 border-t border-line px-7 py-4">
        <button
          onClick={cancel}
          className="cursor-pointer rounded-full border border-line-strong px-6 py-[11px] font-sans text-[13.5px] font-bold text-ink transition-colors hover:bg-card"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={busy}
          className="cursor-pointer rounded-full bg-terra px-[26px] py-[11px] font-sans text-[13.5px] font-bold text-white transition-colors hover:bg-terra-deep disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save item"}
        </button>
      </div>
    </div>
  );
}
