"use client";

export default function ConfirmDialog({
  title,
  body,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(32,30,29,0.45)]"
      onClick={onCancel}
    >
      <div
        className="flex w-[380px] flex-col gap-3 rounded-panel bg-cream p-[26px] shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl text-ink">{title}</h2>
        <p className="font-sans text-[13.5px] leading-relaxed text-muted">{body}</p>
        <div className="mt-1.5 flex justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="cursor-pointer rounded-full border border-line-strong px-5 py-2.5 font-sans text-[13px] font-bold text-ink transition-colors hover:bg-card"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="cursor-pointer rounded-full bg-rust px-5 py-2.5 font-sans text-[13px] font-bold text-white transition-colors hover:bg-rust-deep disabled:opacity-60"
          >
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
