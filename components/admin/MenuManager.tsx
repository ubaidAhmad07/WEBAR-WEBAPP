"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AdminCategory, AdminItem } from "@/lib/admin-types";
import { formatPrice } from "@/lib/tags";
import TagPill from "@/components/TagPill";
import DragDots from "@/components/admin/DragDots";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

type DeleteTarget =
  | { kind: "item"; id: number; name: string }
  | { kind: "category"; id: number; name: string };

export default function MenuManager({ initial }: { initial: AdminCategory[] }) {
  const router = useRouter();
  const [cats, setCats] = useState(initial);
  const [selectedId, setSelectedId] = useState<number | null>(
    initial[0]?.id ?? null,
  );
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    setCats(initial);
    setSelectedId((prev) =>
      prev != null && initial.some((c) => c.id === prev)
        ? prev
        : (initial[0]?.id ?? null),
    );
  }, [initial]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const selected = cats.find((c) => c.id === selectedId) ?? null;

  async function onCategoryDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = cats.findIndex((c) => c.id === active.id);
    const newIndex = cats.findIndex((c) => c.id === over.id);
    const next = arrayMove(cats, oldIndex, newIndex);
    setCats(next);
    await fetch("/api/admin/categories/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((c) => c.id) }),
    });
    router.refresh();
  }

  async function onItemDragEnd(e: DragEndEvent) {
    if (!selected) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = selected.items.findIndex((i) => i.id === active.id);
    const newIndex = selected.items.findIndex((i) => i.id === over.id);
    const nextItems = arrayMove(selected.items, oldIndex, newIndex);
    setCats((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, items: nextItems } : c)),
    );
    await fetch("/api/admin/items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: selected.id,
        ids: nextItems.map((i) => i.id),
      }),
    });
    router.refresh();
  }

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setNewCategoryName("");
    setAddingCategory(false);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const row = await res.json();
      setSelectedId(row.id);
    }
    router.refresh();
  }

  async function renameCategory() {
    if (!selected) return;
    const name = renameValue.trim();
    setRenaming(false);
    if (!name || name === selected.name) return;
    await fetch(`/api/admin/categories/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    router.refresh();
  }

  async function addItem() {
    if (!selected) return;
    const res = await fetch("/api/admin/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: selected.id }),
    });
    if (res.ok) {
      const row = await res.json();
      router.push(`/admin/items/${row.id}?new=1`);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    const url =
      deleteTarget.kind === "item"
        ? `/api/admin/items/${deleteTarget.id}`
        : `/api/admin/categories/${deleteTarget.id}`;
    await fetch(url, { method: "DELETE" });
    setDeleteBusy(false);
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="grid flex-1 grid-cols-[340px_1fr] overflow-hidden">
      {/* Categories sidebar */}
      <aside className="flex flex-col gap-2.5 border-r border-line p-[22px]">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-display text-[17px] text-ink">Categories</h2>
          <span className="font-sans text-[11px] font-medium text-fainter">
            drag to reorder
          </span>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onCategoryDragEnd}
        >
          <SortableContext
            items={cats.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {cats.map((cat) => (
              <SortableCategoryRow
                key={cat.id}
                category={cat}
                selected={cat.id === selectedId}
                onSelect={() => setSelectedId(cat.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
        {addingCategory ? (
          <input
            autoFocus
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addCategory();
              if (e.key === "Escape") setAddingCategory(false);
            }}
            onBlur={addCategory}
            placeholder="Category name"
            className="mt-1.5 rounded-full border border-line bg-card px-4 py-2.5 font-sans text-[13px] text-ink outline-none focus:border-terra"
          />
        ) : (
          <button
            onClick={() => setAddingCategory(true)}
            className="mt-1.5 cursor-pointer rounded-full border border-dashed border-line-dash py-[11px] text-center font-sans text-[13px] font-bold text-muted transition-colors hover:bg-card-hover"
          >
            + Add category
          </button>
        )}
      </aside>

      {/* Items pane */}
      <section className="flex flex-col gap-3 overflow-y-auto px-7 py-[22px]">
        {selected ? (
          <>
            <div className="mb-0.5 flex items-center justify-between">
              <div className="flex items-baseline gap-3">
                {renaming ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") renameCategory();
                      if (e.key === "Escape") setRenaming(false);
                    }}
                    onBlur={renameCategory}
                    className="rounded-full border border-line bg-card px-4 py-1.5 font-display text-[17px] text-ink outline-none focus:border-terra"
                  />
                ) : (
                  <h2 className="font-display text-[17px] text-ink">
                    {selected.name}{" "}
                    <span className="font-sans text-[13px] text-faint">
                      · {selected.items.length}{" "}
                      {selected.items.length === 1 ? "item" : "items"}
                    </span>
                  </h2>
                )}
                <button
                  onClick={() => {
                    setRenameValue(selected.name);
                    setRenaming(true);
                  }}
                  className="cursor-pointer font-sans text-xs font-semibold text-faint hover:text-rust"
                >
                  Rename
                </button>
                <button
                  onClick={() =>
                    setDeleteTarget({
                      kind: "category",
                      id: selected.id,
                      name: selected.name,
                    })
                  }
                  className="cursor-pointer font-sans text-xs font-semibold text-faint hover:text-rust"
                >
                  Delete
                </button>
              </div>
              <button
                onClick={addItem}
                className="cursor-pointer rounded-full bg-terra px-5 py-2.5 font-sans text-[13px] font-bold text-white transition-colors hover:bg-terra-deep"
              >
                + Add item
              </button>
            </div>

            {selected.items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
                <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-sage-tint">
                  <span className="h-[34px] w-[34px] rounded-full bg-sage-mid" />
                </div>
                <div className="font-display text-[19px] text-ink">No items yet</div>
                <div className="font-sans text-[13.5px] text-muted">
                  Add your first dish to this category.
                </div>
                <button
                  onClick={addItem}
                  className="cursor-pointer rounded-full bg-terra px-[22px] py-[11px] font-sans text-[13px] font-bold text-white transition-colors hover:bg-terra-deep"
                >
                  + Add item
                </button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onItemDragEnd}
              >
                <SortableContext
                  items={selected.items.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-2.5">
                    {selected.items.map((item) => (
                      <SortableItemRow
                        key={item.id}
                        item={item}
                        onDelete={() =>
                          setDeleteTarget({
                            kind: "item",
                            id: item.id,
                            name: item.name,
                          })
                        }
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <div className="font-display text-[19px] text-ink">No categories yet</div>
            <div className="font-sans text-[13.5px] text-muted">
              Create a category to start building the menu.
            </div>
          </div>
        )}
      </section>

      {deleteTarget && (
        <ConfirmDialog
          title={deleteTarget.kind === "item" ? "Delete item?" : "Delete category?"}
          body={
            deleteTarget.kind === "item"
              ? `"${deleteTarget.name}" and its 3D model will be removed from the menu. This can't be undone.`
              : `"${deleteTarget.name}" and all its items (including their 3D models) will be removed. This can't be undone.`
          }
          confirmLabel="Delete"
          busy={deleteBusy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function SortableCategoryRow({
  category,
  selected,
  onSelect,
}: {
  category: AdminCategory;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      className={`flex cursor-pointer items-center gap-2.5 rounded-full px-4 py-3 ${
        isDragging ? "z-10 shadow-lift" : ""
      } ${selected ? "bg-terra text-white" : "bg-card text-ink transition-colors hover:bg-card-hover"}`}
    >
      <DragDots light={selected} />
      <span className="font-sans text-[13.5px] font-semibold">{category.name}</span>
      <span
        className={`ml-auto font-sans text-xs font-semibold ${
          selected ? "text-white/75" : "text-faint"
        }`}
      >
        {category.items.length} {category.items.length === 1 ? "item" : "items"}
      </span>
    </div>
  );
}

function ModelStatusPill({ status }: { status: AdminItem["modelStatus"] }) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-pale px-3 py-[5px]">
        <span className="h-2 w-2 rounded-full bg-sage" />
        <span className="font-sans text-[11px] font-semibold text-sage-ink">
          3D model
        </span>
      </span>
    );
  }
  if (status === "compressing") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-pale px-3 py-[5px]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-sage" />
        <span className="font-sans text-[11px] font-semibold text-sage-ink">
          Compressing…
        </span>
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-peach-pale px-3 py-[5px]">
        <span className="h-2 w-2 rounded-full bg-rust" />
        <span className="font-sans text-[11px] font-semibold text-rust-deep">
          3D failed
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(32,30,29,0.2)] px-3 py-[5px]">
      <span className="h-2 w-2 rounded-full bg-fainter" />
      <span className="font-sans text-[11px] font-semibold text-faint">No 3D yet</span>
    </span>
  );
}

function SortableItemRow({
  item,
  onDelete,
}: {
  item: AdminItem;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3.5 rounded-card bg-card px-[18px] py-3 ${
        isDragging ? "z-10 shadow-lift" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <DragDots />
      </button>
      <div className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-2xl">
        {item.coverPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverPhotoUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="stripe h-full w-full" />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-sans text-[14.5px] font-semibold text-ink">
          {item.name}
        </span>
        {item.tags.length > 0 && (
          <span className="flex gap-1.5">
            {item.tags.slice(0, 3).map((t) => (
              <TagPill key={t} tag={t} />
            ))}
          </span>
        )}
      </div>
      <span className="ml-auto font-sans text-sm font-bold text-rust">
        {formatPrice(item.priceCents)}
      </span>
      <ModelStatusPill status={item.modelStatus} />
      <Link
        href={`/admin/items/${item.id}`}
        className="font-sans text-[12.5px] font-bold text-rust hover:text-rust-deep"
      >
        Edit
      </Link>
      <button
        onClick={onDelete}
        className="cursor-pointer font-sans text-[12.5px] font-semibold text-fainter hover:text-rust"
      >
        Delete
      </button>
    </div>
  );
}
