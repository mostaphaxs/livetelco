// Crops still "scenes" out of the LiveTelco film frames for use as section imagery.
// Usage: node scripts/make-scenes.mjs <folder with fNN.jpg frames grabbed from the 720p film>
// (frames: ffmpeg -ss NN -i public/media/livetelco-film-720.mp4 -frames:v 1 -q:v 2 fNN.jpg)
import sharp from "sharp";
import { join } from "node:path";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dir = process.argv[2];
const out = fileURLToPath(new URL("../public/media/scenes", import.meta.url));
const crops = {
  "land.webp": ["f36.jpg", 594, 200, 560, 270], // drone footage of the Abuja plot
  "teleport.webp": ["f38.jpg", 560, 105, 720, 560], // isometric teleport compound
  "how.webp": ["f50.jpg", 20, 130, 1240, 560], // satellites -> antennas -> shelter -> grid
  "serve.webp": ["f84.jpg", 470, 120, 810, 560], // LEO / GEO / remote users
  "coloc.webp": ["f98.jpg", 470, 125, 670, 315], // shared vs dedicated
  "security.webp": ["f116.jpg", 540, 90, 740, 600], // fenced compound, CCTV, alerts
};
for (const [name, [f, left, top, width, height]] of Object.entries(crops)) {
  const p = join(out, name);
  await sharp(join(dir, f)).extract({ left, top, width, height }).webp({ quality: 84 }).toFile(p);
  console.log(name.padEnd(14), `${width}x${height}`, `${(statSync(p).size / 1024).toFixed(0)} KB`);
}
