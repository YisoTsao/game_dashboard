import { DataTexture, NearestFilter, RedFormat } from 'three';

let cached: DataTexture | null = null;

/** Three-step gradient for MeshToonMaterial: shadow, mid, light. Gives flat cel shading. */
export function toonGradient(): DataTexture {
  if (cached) return cached;
  const data = new Uint8Array([90, 170, 255]);
  const tex = new DataTexture(data, data.length, 1, RedFormat);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  cached = tex;
  return tex;
}
