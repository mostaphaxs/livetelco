// Compresses the three.js / NASA earth textures into WebP files in public/earth.
// Usage: node scripts/make-textures.mjs <folder with the downloaded textures>
// Sources (github.com/mrdoob/three.js, examples/textures/planets):
//   earth_day_4096.jpg, earth_night_4096.jpg, earth_bump_roughness_clouds_4096.jpg
//   (R = relief, G = roughness: land 1 / ocean 0, B = clouds), earth_normal_2048.jpg
import sharp from "sharp";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const inDir = process.argv[2];
const outDir = fileURLToPath(new URL("../public/earth", import.meta.url));
mkdirSync(outDir, { recursive: true });
const packed = join(inDir, "earth_bump_roughness_clouds_4096.jpg");

const jobs = [
  ["day.webp", () => sharp(join(inDir, "earth_day_4096.jpg")).webp({ quality: 84, smartSubsample: true })],
  ["night.webp", () => sharp(join(inDir, "earth_night_4096.jpg")).webp({ quality: 78 })],
  ["clouds.webp", () => sharp(packed).extractChannel(2).webp({ quality: 66, effort: 6 })],
  // ocean mask for the sun glint: oceans white, land black
  ["specular.webp", () => sharp(packed).extractChannel(1).negate().resize(2048).webp({ quality: 80 })],
];
if (existsSync(join(inDir, "earth_normal_2048.jpg")))
  jobs.push(["normal.webp", () => sharp(join(inDir, "earth_normal_2048.jpg")).webp({ quality: 80 })]);

for (const [dst, fn] of jobs) {
  const out = join(outDir, dst);
  await fn().toFile(out);
  const m = await sharp(out).metadata();
  console.log(`${dst.padEnd(14)} ${m.width}x${m.height}  ${(statSync(out).size / 1024).toFixed(0)} KB`);
}
