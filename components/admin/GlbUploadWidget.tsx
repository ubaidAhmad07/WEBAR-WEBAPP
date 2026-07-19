"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const SpinViewer = dynamic(() => import("@/components/SpinViewer"), { ssr: false });

export type ModelInfo = {
  status: "none" | "compressing" | "ready" | "error";
  url?: string | null;
  originalBytes?: number | null;
  compressedBytes?: number | null;
  errorMessage?: string | null;
};

type Phase =
  | { name: "empty" }
  | { name: "uploading"; fileName: string; fileSize: number; progress: number }
  | { name: "compressing"; fileName: string | null }
  | { name: "ready"; url: string; compressedBytes: number | null }
  | { name: "error"; message: string };

function mb(bytes: number | null | undefined): string {
  return bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : "—";
}

function phaseFromInfo(info: ModelInfo): Phase {
  switch (info.status) {
    case "ready":
      return {
        name: "ready",
        url: info.url ?? "",
        compressedBytes: info.compressedBytes ?? null,
      };
    case "compressing":
      return { name: "compressing", fileName: null };
    case "error":
      return { name: "error", message: info.errorMessage ?? "Something went wrong." };
    default:
      return { name: "empty" };
  }
}

export default function GlbUploadWidget({
  itemId,
  initial,
}: {
  itemId: number;
  initial: ModelInfo;
}) {
  const [phase, setPhase] = useState<Phase>(() => phaseFromInfo(initial));
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      xhrRef.current?.abort();
    };
  }, []);

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/admin/models/${itemId}`);
      if (!res.ok) return;
      const info: ModelInfo = await res.json();
      if (info.status === "ready" || info.status === "error") {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setPhase(phaseFromInfo(info));
      }
    }, 2000);
  }

  useEffect(() => {
    if (phase.name === "compressing" && !pollRef.current) startPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.name]);

  function upload(file: File) {
    if (!file.name.toLowerCase().endsWith(".glb")) {
      setPhase({
        name: "error",
        message: "Wrong format — only .glb files are supported.",
      });
      return;
    }
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    setPhase({
      name: "uploading",
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
    });
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100);
        setPhase((p) => (p.name === "uploading" ? { ...p, progress } : p));
      }
    };
    xhr.onload = () => {
      xhrRef.current = null;
      if (xhr.status >= 200 && xhr.status < 300) {
        setPhase({ name: "compressing", fileName: file.name });
      } else {
        let message = "Upload failed.";
        try {
          message = JSON.parse(xhr.responseText).error ?? message;
        } catch {}
        setPhase({ name: "error", message });
      }
    };
    xhr.onerror = () => {
      xhrRef.current = null;
      setPhase({ name: "error", message: "Network error during upload." });
    };
    const form = new FormData();
    form.append("file", file);
    xhr.open("POST", `/api/admin/models/${itemId}`);
    xhr.send(form);
  }

  function cancelUpload() {
    xhrRef.current?.abort();
    xhrRef.current = null;
    setPhase({ name: "empty" });
  }

  async function removeFile() {
    await fetch(`/api/admin/models/${itemId}`, { method: "DELETE" });
    setPhase({ name: "empty" });
  }

  const browse = (
    <input
      ref={inputRef}
      type="file"
      accept=".glb"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) upload(file);
        e.target.value = "";
      }}
    />
  );

  if (phase.name === "empty") {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) upload(file);
        }}
        className={`flex flex-col items-center gap-2.5 rounded-3xl border border-dashed border-line-dash bg-cream p-[26px] transition-colors ${
          dragOver ? "bg-card-hover" : ""
        }`}
      >
        {browse}
        <span className="font-sans text-[13.5px] text-muted">
          Drop a .glb file here, or
        </span>
        <button
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-full bg-terra px-5 py-2 font-sans text-[13px] font-bold text-white transition-colors hover:bg-terra-deep"
        >
          Browse files
        </button>
      </div>
    );
  }

  if (phase.name === "uploading") {
    return (
      <div className="flex flex-col gap-3 rounded-3xl bg-cream p-5">
        <div className="flex items-baseline justify-between">
          <span className="font-sans text-[13px] font-semibold text-ink">
            {phase.fileName}
          </span>
          <span className="font-sans text-xs font-medium text-faint">
            {mb(phase.fileSize)}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-card">
          <div
            className="h-full rounded-full bg-terra transition-[width]"
            style={{ width: `${phase.progress}%` }}
          />
        </div>
        <div className="font-sans text-[12.5px] font-semibold text-rust">
          Uploading… {phase.progress}%
        </div>
        <button
          onClick={cancelUpload}
          className="cursor-pointer text-center font-sans text-xs font-medium text-faint hover:text-rust"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (phase.name === "compressing") {
    return (
      <div className="flex flex-col gap-3 rounded-3xl bg-cream p-5">
        <div className="flex items-baseline justify-between">
          <span className="font-sans text-[13px] font-semibold text-ink">
            {phase.fileName ?? "3D model"}
          </span>
          <span className="font-sans text-xs font-medium text-faint">uploaded ✓</span>
        </div>
        <div
          className="h-3 animate-pulse rounded-full"
          style={{
            background:
              "repeating-linear-gradient(45deg,#aebf92 0 10px,#e1eecc 10px 20px)",
          }}
        />
        <div className="font-sans text-[12.5px] font-semibold text-sage-text">
          Compressing on the server… usually under a minute
        </div>
        <div className="font-sans text-xs font-medium text-faint">
          You can keep editing — we&apos;ll mark it ready.
        </div>
      </div>
    );
  }

  if (phase.name === "ready") {
    return (
      <div className="flex flex-col gap-2.5">
        {browse}
        <div className="stripe h-[170px] overflow-hidden rounded-3xl">
          {phase.url && <SpinViewer src={phase.url} className="h-full w-full" />}
        </div>
        <div className="flex items-center gap-2">
          <span className="h-[9px] w-[9px] rounded-full bg-sage" />
          <span className="font-sans text-xs font-semibold text-sage-ink">
            Ready · compressed to {mb(phase.compressedBytes)}
          </span>
          <button
            onClick={() => inputRef.current?.click()}
            className="ml-auto cursor-pointer rounded-full border border-line-strong px-3.5 py-1.5 font-sans text-[11.5px] font-bold text-ink transition-colors hover:bg-card-hover"
          >
            Replace
          </button>
          <button
            onClick={removeFile}
            className="cursor-pointer font-sans text-[11.5px] font-semibold text-fainter hover:text-rust"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-cream p-5">
      {browse}
      <div className="flex flex-col gap-1.5 rounded-[20px] bg-peach p-3.5">
        <span className="font-sans text-[13px] font-bold text-rust-deep">
          Upload failed
        </span>
        <span className="font-sans text-[12.5px] leading-snug text-rust">
          {phase.message}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-full bg-terra px-[18px] py-2 font-sans text-[12.5px] font-bold text-white transition-colors hover:bg-terra-deep"
        >
          Try again
        </button>
        <button
          onClick={removeFile}
          className="cursor-pointer rounded-full border border-line-strong px-[18px] py-2 font-sans text-[12.5px] font-bold text-ink transition-colors hover:bg-card-hover"
        >
          Remove file
        </button>
      </div>
    </div>
  );
}
