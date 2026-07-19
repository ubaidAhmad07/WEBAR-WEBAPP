"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const SECONDS_PER_TURN = 9;

type UiState =
  | "intro" // camera pre-prompt card (O·03)
  | "starting" // MindAR booting + browser permission prompt
  | "scanning" // looking for the QR marker (O·04)
  | "found" // marker locked, confirm sheet (O·05)
  | "placed" // model anchored + spinning (O·06)
  | "error"; // camera denied / AR failed

type ArHandles = {
  stop: () => void;
  setPlaced: (placed: boolean) => void;
};

export default function ARExperience({
  itemId,
  itemName,
  priceLabel,
  modelUrl,
  mindTargetUrl,
}: {
  itemId: number;
  itemName: string;
  priceLabel: string;
  modelUrl: string;
  mindTargetUrl: string;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [ui, setUi] = useState<UiState>("intro");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const uiRef = useRef<UiState>("intro");
  uiRef.current = ui;
  const trackingRef = useRef(false);
  const placedRef = useRef(false);
  const handlesRef = useRef<ArHandles | null>(null);

  useEffect(() => {
    return () => {
      handlesRef.current?.stop();
      handlesRef.current = null;
    };
  }, []);

  async function startAr() {
    const container = containerRef.current;
    if (!container) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      router.replace(`/view/${itemId}?reason=no-ar`);
      return;
    }
    setUi("starting");
    try {
      const { MindARThree } = await import("mind-ar/dist/mindar-image-three.prod.js");
      const mindar = new MindARThree({
        container,
        imageTargetSrc: mindTargetUrl,
        uiScanning: "no",
        uiLoading: "no",
        uiError: "no",
        filterMinCF: 0.0001,
        filterBeta: 0.001,
      });
      const { renderer, scene, camera } = mindar;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

      // Content lives on the scene root (not the anchor group) so it can
      // persist at its last pose when tracking is lost (PRD decision #7).
      const contentGroup = new THREE.Group();
      contentGroup.matrixAutoUpdate = false;
      contentGroup.visible = false;
      scene.add(contentGroup);

      // Stand the model up out of the marker plane (+y model → +z marker).
      const uprightGroup = new THREE.Group();
      uprightGroup.rotation.x = Math.PI / 2;
      contentGroup.add(uprightGroup);

      const spinGroup = new THREE.Group();
      uprightGroup.add(spinGroup);

      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      const gltf = await loader.loadAsync(modelUrl);
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 0.8 / maxDim; // marker width == 1 unit in anchor space
      model.position.set(-center.x, -box.min.y, -center.z); // feet on the marker
      spinGroup.add(model);
      spinGroup.scale.setScalar(scale);

      const anchor = mindar.addAnchor(0);
      anchor.onTargetFound = () => {
        trackingRef.current = true;
        if (!placedRef.current && uiRef.current !== "placed") setUi("found");
      };
      anchor.onTargetLost = () => {
        trackingRef.current = false;
        // Placed content simply stops receiving matrix updates and stays put.
        if (!placedRef.current && uiRef.current === "found") setUi("scanning");
      };

      const clock = new THREE.Clock();
      const speed = (Math.PI * 2) / SECONDS_PER_TURN;
      renderer.setAnimationLoop(() => {
        spinGroup.rotation.y += speed * clock.getDelta();
        if (trackingRef.current) {
          anchor.group.updateWorldMatrix(true, false);
          contentGroup.matrix.copy(anchor.group.matrixWorld);
        }
        renderer.render(scene, camera);
      });

      handlesRef.current = {
        stop: () => {
          try {
            renderer.setAnimationLoop(null);
            mindar.stop();
            pmrem.dispose();
            renderer.dispose();
          } catch {}
        },
        setPlaced: (placed: boolean) => {
          contentGroup.visible = placed;
        },
      };

      await mindar.start();
      setUi("scanning");
    } catch (err) {
      console.error("AR start failed:", err);
      setErrorMessage(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera access was denied."
          : "AR couldn't start on this device.",
      );
      setUi("error");
    }
  }

  function placeModel() {
    placedRef.current = true;
    handlesRef.current?.setPlaced(true);
    setUi("placed");
  }

  function rescan() {
    placedRef.current = false;
    handlesRef.current?.setPlaced(false);
    setUi(trackingRef.current ? "found" : "scanning");
  }

  function close() {
    handlesRef.current?.stop();
    handlesRef.current = null;
    router.push(`/item/${itemId}`);
  }

  const inCamera = ui === "scanning" || ui === "found" || ui === "placed";

  return (
    <div className="fixed inset-0 flex flex-col bg-ar-bg">
      {/* MindAR mounts the camera feed + WebGL canvas here */}
      <div ref={containerRef} className="absolute inset-0 overflow-hidden" />

      {/* ---- intro / permission card (O·03) ---- */}
      {(ui === "intro" || ui === "starting") && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6">
          <div className="flex w-[300px] flex-col gap-3 rounded-panel bg-cream p-6 shadow-modal">
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-peach">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#c67139"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="7" width="18" height="13" rx="4" />
                <circle cx="12" cy="13.5" r="3.5" />
                <path d="M9 7l1.5-3h3L15 7" />
              </svg>
            </div>
            <h1 className="font-display text-xl text-ink">Allow camera access</h1>
            <p className="font-sans text-[13px] leading-relaxed text-muted">
              The camera is only used to find the QR code on your table. Nothing
              is recorded.
            </p>
            <button
              onClick={startAr}
              disabled={ui === "starting"}
              className="cursor-pointer rounded-full bg-terra py-3 text-center font-sans text-sm font-bold text-white transition-colors hover:bg-terra-deep disabled:opacity-70"
            >
              {ui === "starting" ? "Starting camera…" : "Allow camera"}
            </button>
            <Link
              href={`/view/${itemId}`}
              className="text-center font-sans text-[12.5px] font-semibold text-rust hover:text-rust-deep"
            >
              View in 3D instead
            </Link>
          </div>
        </div>
      )}

      {/* ---- error card ---- */}
      {ui === "error" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6">
          <div className="flex w-[300px] flex-col gap-3 rounded-panel bg-cream p-6 shadow-modal">
            <h1 className="font-display text-xl text-ink">AR unavailable</h1>
            <p className="font-sans text-[13px] leading-relaxed text-muted">
              {errorMessage} You can still see the dish in the 3D viewer — same
              rotation, no camera needed.
            </p>
            <Link
              href={`/view/${itemId}?reason=no-ar`}
              className="rounded-full bg-terra py-3 text-center font-sans text-sm font-bold text-white transition-colors hover:bg-terra-deep"
            >
              View in 3D
            </Link>
            <button
              onClick={close}
              className="cursor-pointer text-center font-sans text-[12.5px] font-semibold text-rust hover:text-rust-deep"
            >
              Back to the item
            </button>
          </div>
        </div>
      )}

      {/* ---- top bar ---- */}
      {inCamera && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-5">
          {ui === "placed" ? (
            <span className="mx-auto rounded-full bg-sage-ink px-3.5 py-1.5 font-sans text-[10.5px] font-semibold text-sage-tint">
              Anchored — stays if code leaves frame
            </span>
          ) : (
            <span className="rounded-full bg-[rgba(245,234,216,0.12)] px-3 py-[5px] font-sans text-[11px] font-semibold tracking-wide text-ar-accent">
              AR view
            </span>
          )}
          <button
            onClick={close}
            aria-label="Close AR"
            className="pointer-events-auto flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full bg-[rgba(245,234,216,0.12)]"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f5ead8"
              strokeWidth="2.75"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ---- scanning overlay (O·04) ---- */}
      {ui === "scanning" && (
        <>
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="flex h-[220px] w-[220px] items-center justify-center rounded-[36px] border-2 border-dashed border-ar-accent">
              <span className="font-sans text-[11px] font-semibold tracking-widest text-ar-accent">
                searching…
              </span>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2.5 px-9 pb-10 text-center">
            <p className="font-sans text-[14.5px] leading-relaxed text-card-hover">
              Point your camera at the QR code on the table
            </p>
            <Link
              href={`/view/${itemId}`}
              className="font-sans text-[12.5px] font-semibold text-ar-accent"
            >
              Having trouble? View in 3D
            </Link>
          </div>
        </>
      )}

      {/* ---- marker found / confirm (O·05) ---- */}
      {ui === "found" && (
        <>
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-4">
            <span className="rounded-full bg-sage px-3.5 py-1.5 font-sans text-[11px] font-bold text-white">
              QR code found
            </span>
            <div className="flex h-[220px] w-[220px] items-center justify-center rounded-[36px] border-2 border-ar-accent2">
              <span className="font-sans text-[11px] font-semibold tracking-widest text-ar-accent">
                marker locked
              </span>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 rounded-t-panel bg-cream px-5 pb-6 pt-[22px]">
            <h2 className="font-display text-[19px] text-ink">Place model here?</h2>
            <p className="font-sans text-[13px] leading-relaxed text-muted">
              The dish will appear on the QR code and stay anchored, even if the
              code leaves the frame.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={placeModel}
                className="flex-1 cursor-pointer rounded-full bg-terra py-3 text-center font-sans text-sm font-bold text-white transition-colors hover:bg-terra-deep"
              >
                Place model
              </button>
              <button
                onClick={rescan}
                className="flex-1 cursor-pointer rounded-full border border-line-strong py-3 text-center font-sans text-sm font-bold text-ink transition-colors hover:bg-card"
              >
                Re-scan
              </button>
            </div>
          </div>
        </>
      )}

      {/* ---- placed (O·06) ---- */}
      {ui === "placed" && (
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 px-5 pb-6">
          <span className="mx-auto font-sans text-[11px] font-semibold tracking-wide text-ar-accent">
            rotating · {SECONDS_PER_TURN} s / turn
          </span>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-display text-base text-cream">{itemName}</span>
              <span className="font-sans text-[13px] font-semibold text-ar-cream-dim">
                {priceLabel}
              </span>
            </div>
            <button
              onClick={rescan}
              className="cursor-pointer rounded-full border border-[rgba(245,234,216,0.4)] px-4 py-[9px] font-sans text-xs font-bold text-cream transition-colors hover:bg-[rgba(245,234,216,0.1)]"
            >
              Reset placement
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
