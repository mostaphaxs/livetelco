// Loads the precomputed land-dot dataset once (39 KB binary, Int16 lat/lon * 100).
let cache: Promise<Float32Array> | null = null;

/** Returns a flat [lat, lon, lat, lon, ...] array in degrees. */
export function loadLandDots(): Promise<Float32Array> {
  if (!cache) {
    cache = fetch("/land-dots.bin")
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const src = new Int16Array(buf);
        const out = new Float32Array(src.length);
        for (let i = 0; i < src.length; i++) out[i] = src[i] / 100;
        return out;
      });
  }
  return cache;
}

export function latLonToVec3(lat: number, lon: number, r: number): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return [-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)];
}
