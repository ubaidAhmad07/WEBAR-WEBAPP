"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Constant-speed spinning .glb viewer — the same rotation math as the AR
 * scene, so both modes read identically (PRD: one full turn every 9s).
 */
export default function SpinViewer({
  src,
  className,
  secondsPerTurn = 9,
}: {
  src: string;
  className?: string;
  secondsPerTurn?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    camera.position.set(0, 0.5, 2.1);
    camera.lookAt(0, 0, 0);

    const group = new THREE.Group();
    scene.add(group);

    let disposed = false;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      src,
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        model.position.sub(center);
        group.add(model);
        group.scale.setScalar(1.5 / maxDim);
      },
      undefined,
      (err) => console.error("SpinViewer load error:", err),
    );

    const clock = new THREE.Clock();
    const speed = (Math.PI * 2) / secondsPerTurn;
    renderer.setAnimationLoop(() => {
      group.rotation.y += speed * clock.getDelta();
      renderer.render(scene, camera);
    });

    const resize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => {
      disposed = true;
      observer.disconnect();
      renderer.setAnimationLoop(null);
      pmrem.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [src, secondsPerTurn]);

  return <div ref={containerRef} className={className} />;
}
