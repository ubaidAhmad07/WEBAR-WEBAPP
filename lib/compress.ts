import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { dedup, prune, weld, reorder, quantize, textureCompress } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

/**
 * Compress a .glb: dedup/prune/weld, meshopt geometry compression,
 * textures resized + re-encoded as WebP. Empirical knobs per PRD decision #6.
 */
export async function compressGlb(input: Uint8Array): Promise<Uint8Array> {
  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      "meshopt.encoder": MeshoptEncoder,
      "meshopt.decoder": MeshoptDecoder,
    });

  const document = await io.readBinary(input);

  await document.transform(
    dedup(),
    prune(),
    weld(),
    reorder({ encoder: MeshoptEncoder }),
    quantize(),
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: [1024, 1024],
    }),
  );

  document
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });

  return io.writeBinary(document);
}

/** GLB files start with the ASCII magic "glTF". */
export function looksLikeGlb(buf: Uint8Array): boolean {
  return (
    buf.length > 12 &&
    buf[0] === 0x67 && // g
    buf[1] === 0x6c && // l
    buf[2] === 0x54 && // T
    buf[3] === 0x46 // F
  );
}

export const MAX_GLB_BYTES = 100 * 1024 * 1024;
