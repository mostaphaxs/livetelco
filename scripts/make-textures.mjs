// Compresses the three.js / NASA earth textures into small WebP files in public/earth.
// Usage: node scripts/make-textures.mjs <folder with the downloaded textures>
import sharp from "sharp";
import { mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const inDir = process.argv[2];
const outDir = fileURLToPath(new URL("../public/earth", import.meta.url));
mkdirSync(outDir, { recursive: true });

const jobs = [
  ["earth_atmos_2048.jpg", "day.webp", (s) => s.webp({ quality: 82 })],
  ["earth_lights_2048.png", "night.webp", (s) => s.webp({ quality: 75 })],
  ["earth_normal_2048.jpg", "normal.webp", (s) => s.webp({ quality: 80 })],
  ["earth_specular_2048.jpg", "specular.webp", (s) => s.resize(1024).grayscale().webp({ quality: 70 })],
  // cloud coverage lives in the PNG alpha channel
  ["earth_clouds_1024.png", "clouds.webp", (s) => s.ensureAlpha().extractChannel(3).webp({ quality: 78 })],
];

for (const [src, dst, fn] of jobs) {
  const out = join(outDir, dst);
  await fn(sharp(join(inDir, src))).toFile(out);
  console.log(`${dst.padEnd(14)} ${(statSync(out).size / 1024).toFixed(0)} KB`);
}
