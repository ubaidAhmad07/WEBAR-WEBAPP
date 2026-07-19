"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Status = {
  running: boolean;
  progress: number;
  error: string | null;
  menuUrl: string | null;
  qrUrl: string | null;
  hasMarker: boolean;
};

export default function QrStudio({
  initialUrl,
  initialQrUrl,
  hasMarker,
}: {
  initialUrl: string;
  initialQrUrl: string | null;
  hasMarker: boolean;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [editingUrl, setEditingUrl] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState(initialQrUrl);
  const [marker, setMarker] = useState<{
    state: "none" | "saved" | "stale" | "compiling" | "error";
    progress: number;
    message?: string;
  }>({ state: hasMarker ? "saved" : "none", progress: 0 });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cacheBust = useRef(0);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function pollStatus() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const res = await fetch("/api/admin/qr/status");
      if (!res.ok) return;
      const status: Status = await res.json();
      if (status.running) {
        setMarker({ state: "compiling", progress: status.progress });
        return;
      }
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      if (status.error) {
        setMarker({ state: "error", progress: 0, message: status.error });
      } else if (status.hasMarker) {
        cacheBust.current = Date.now();
        setQrUrl(status.qrUrl ? `${status.qrUrl}?v=${cacheBust.current}` : null);
        setMarker({ state: "saved", progress: 100 });
        router.refresh();
      }
    }, 1200);
  }

  async function generate() {
    setMarker({ state: "compiling", progress: 0 });
    const res = await fetch("/api/admin/qr/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuUrl: url }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setMarker({
        state: "error",
        progress: 0,
        message: body?.error ?? "Failed to start generation",
      });
      return;
    }
    pollStatus();
  }

  async function uploadMindManually(file: File) {
    const form = new FormData();
    form.append("menuUrl", url);
    form.append("mind", file);
    const res = await fetch("/api/admin/qr", { method: "POST", body: form });
    if (res.ok) {
      setMarker({ state: "saved", progress: 100 });
      router.refresh();
    } else {
      setMarker({ state: "error", progress: 0, message: "Upload failed — try again." });
    }
  }

  function print() {
    if (!qrUrl) return;
    const win = window.open("", "_blank", "width=480,height=560");
    if (!win) return;
    win.document.write(
      `<img src="${qrUrl}" style="width:320px" onload="window.print();window.close()">`,
    );
    win.document.close();
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Our menu", url });
      } catch {}
    } else {
      copyUrl();
    }
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const mindInputRef = useRef<HTMLInputElement>(null);
  const outlineBtn =
    "cursor-pointer rounded-full border border-line-strong px-[26px] py-3 font-sans text-[13.5px] font-bold text-ink transition-colors hover:bg-card disabled:opacity-50";

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-[18px] overflow-hidden py-10">
      <div className="pointer-events-none absolute -bottom-20 -left-[60px] h-[260px] w-[260px] rounded-full bg-peach" />
      <div className="pointer-events-none absolute -top-[60px] -right-10 h-[220px] w-[220px] rounded-full bg-sage-tint" />

      <h1 className="relative font-display text-[26px] text-ink">Your table QR code</h1>
      <p className="relative font-sans text-sm text-muted">
        Guests scan this to open the menu — it&apos;s also the AR tracking marker.
      </p>

      <div className="relative rounded-panel bg-surface p-[26px] shadow-lift">
        {qrUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrUrl} alt="Menu QR code" className="block h-[300px] w-[300px] rounded-2xl" />
        ) : (
          <div className="stripe flex h-[300px] w-[300px] items-center justify-center rounded-2xl">
            <span className="font-mono text-[11px] tracking-wider text-rust">
              qr not generated yet
            </span>
          </div>
        )}
      </div>

      <div className="relative flex gap-2.5">
        <a
          href={qrUrl ?? undefined}
          download="menu-qr.png"
          aria-disabled={!qrUrl}
          className={`rounded-full bg-terra px-[26px] py-3 font-sans text-[13.5px] font-bold text-white transition-colors hover:bg-terra-deep ${
            qrUrl ? "cursor-pointer" : "pointer-events-none opacity-50"
          }`}
        >
          Download
        </a>
        <button onClick={print} disabled={!qrUrl} className={outlineBtn}>
          Print
        </button>
        <button onClick={share} className={outlineBtn}>
          Share
        </button>
      </div>

      <div className="relative flex items-center gap-2.5 rounded-full bg-card py-2 pl-5 pr-2">
        {editingUrl ? (
          <input
            autoFocus
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setMarker((m) => (m.state === "saved" ? { ...m, state: "stale" } : m));
            }}
            onBlur={() => setEditingUrl(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingUrl(false)}
            className="w-[320px] bg-transparent font-mono text-[13px] text-muted outline-none"
          />
        ) : (
          <button
            onClick={() => setEditingUrl(true)}
            title="Click to edit the menu URL"
            className="cursor-text font-mono text-[13px] text-muted"
          >
            {url}
          </button>
        )}
        <button
          onClick={copyUrl}
          className="cursor-pointer rounded-full bg-sage px-[18px] py-2 font-sans text-[12.5px] font-bold text-white transition-colors hover:bg-sage-deep"
        >
          {copied ? "Copied ✓" : "Copy URL"}
        </button>
      </div>

      {/* AR marker status + actions */}
      <div className="relative flex w-[520px] flex-col gap-3 rounded-card bg-card p-[18px]">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              marker.state === "saved" ? "bg-sage" : "bg-fainter"
            }`}
          />
          <span className="font-display text-base text-ink">AR marker</span>
          <span className="ml-auto font-sans text-[11px] font-medium text-faint">
            compiled from this exact QR — needed for AR tracking
          </span>
        </div>

        {marker.state === "compiling" ? (
          <div className="flex flex-col gap-2">
            <div className="h-3 overflow-hidden rounded-full bg-cream">
              <div
                className="h-full rounded-full bg-sage transition-[width]"
                style={{ width: `${marker.progress}%` }}
              />
            </div>
            <span className="font-sans text-[12.5px] font-semibold text-sage-text">
              Compiling marker on the server… {marker.progress}% — usually under a
              minute
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <span className="font-sans text-[12.5px] text-muted">
              {marker.state === "saved" &&
                "QR + marker are generated and saved — AR is live."}
              {marker.state === "none" &&
                "Not generated yet — AR can't track until this is done."}
              {marker.state === "stale" &&
                "URL changed — regenerate so the printed QR and marker match."}
              {marker.state === "error" && (marker.message ?? "Something failed.")}
            </span>
            <button
              onClick={generate}
              className="ml-auto shrink-0 cursor-pointer rounded-full bg-terra px-4 py-2 font-sans text-xs font-bold text-white transition-colors hover:bg-terra-deep"
            >
              {marker.state === "saved" ? "Regenerate" : "Generate QR + marker"}
            </button>
            <input
              ref={mindInputRef}
              type="file"
              accept=".mind"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadMindManually(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => mindInputRef.current?.click()}
              title="Upload a .mind file compiled elsewhere"
              className="shrink-0 cursor-pointer font-sans text-xs font-semibold text-faint hover:text-rust"
            >
              Upload .mind
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
