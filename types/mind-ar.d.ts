declare module "mind-ar/dist/mindar-image.prod.js" {
  /** In-browser image-target compiler (same engine as MindAR's web compiler tool). */
  export class Compiler {
    compileImageTargets(
      images: HTMLImageElement[],
      onProgress?: (progress: number) => void,
    ): Promise<unknown>;
    exportData(): Promise<ArrayBuffer>;
  }
}

declare module "mind-ar/dist/mindar-image-three.prod.js" {
  import type { Group, PerspectiveCamera, Scene, WebGLRenderer } from "three";

  export interface MindARAnchor {
    group: Group;
    onTargetFound: () => void;
    onTargetLost: () => void;
  }

  export class MindARThree {
    constructor(options: {
      container: HTMLElement;
      imageTargetSrc: string;
      uiScanning?: string;
      uiLoading?: string;
      uiError?: string;
      filterMinCF?: number;
      filterBeta?: number;
      missTolerance?: number;
      warmupTolerance?: number;
    });
    renderer: WebGLRenderer;
    scene: Scene;
    camera: PerspectiveCamera;
    addAnchor(targetIndex: number): MindARAnchor;
    start(): Promise<void>;
    stop(): void;
  }
}
