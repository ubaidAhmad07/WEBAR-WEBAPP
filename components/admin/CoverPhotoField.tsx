"use client";

import { useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

async function cropToWebp(imageSrc: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))),
      "image/webp",
      0.9,
    );
  });
}

export default function CoverPhotoField({
  itemId,
  initialUrl,
}: {
  itemId: number;
  initialUrl: string | null;
}) {
  const [photoUrl, setPhotoUrl] = useState(initialUrl);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function applyCrop() {
    if (!cropSrc || !cropArea) return;
    setBusy(true);
    try {
      const blob = await cropToWebp(cropSrc, cropArea);
      const form = new FormData();
      form.append("file", new File([blob], "cover.webp", { type: "image/webp" }));
      const res = await fetch(`/api/admin/items/${itemId}/photo`, {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        const { url } = await res.json();
        setPhotoUrl(`${url}?v=${Date.now()}`);
        setCropSrc(null);
      }
    } finally {
      setBusy(false);
    }
  }

  const buttonClass =
    "cursor-pointer rounded-full border border-line-strong bg-cream px-[15px] py-[7px] font-sans text-xs font-bold text-ink transition-colors hover:bg-card";

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-sans text-xs font-semibold text-muted">Cover photo</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) pickFile(file);
          e.target.value = "";
        }}
      />
      <div className="relative h-[190px] overflow-hidden rounded-card border border-dashed border-line-dash">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="Cover" className="h-full w-full object-cover" />
        ) : (
          <div className="stripe h-full w-full" />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          {!photoUrl && (
            <span className="font-mono text-[11px] tracking-wider text-rust">
              no cover photo yet
            </span>
          )}
          <div className="flex gap-2">
            <button onClick={() => inputRef.current?.click()} className={buttonClass}>
              {photoUrl ? "Replace" : "Upload"}
            </button>
            {photoUrl && (
              <button onClick={() => setCropSrc(photoUrl)} className={buttonClass}>
                Crop
              </button>
            )}
          </div>
        </div>
      </div>

      {cropSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(32,30,29,0.45)]">
          <div className="flex w-[520px] flex-col gap-4 rounded-panel bg-cream p-6 shadow-modal">
            <h2 className="font-display text-xl text-ink">Crop cover photo</h2>
            <div className="relative h-[280px] overflow-hidden rounded-card bg-ink">
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_area, pixels) => setCropArea(pixels)}
              />
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="accent-terra"
            />
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setCropSrc(null)}
                className="cursor-pointer rounded-full border border-line-strong px-5 py-2.5 font-sans text-[13px] font-bold text-ink transition-colors hover:bg-card"
              >
                Cancel
              </button>
              <button
                onClick={applyCrop}
                disabled={busy}
                className="cursor-pointer rounded-full bg-terra px-6 py-2.5 font-sans text-[13px] font-bold text-white transition-colors hover:bg-terra-deep disabled:opacity-60"
              >
                {busy ? "Saving…" : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
