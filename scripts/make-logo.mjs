// Removes the flat dark background from info/logo.png -> public/logo.png (fully transparent bg).
// Alpha comes from the distance to the background colour, and colours are
// "un-mixed" from the background so anti-aliased edges stay clean on any backdrop.
import sharp from "sharp";

import { fileURLToPath } from "node:url";
const src = fileURLToPath(new URL("../info/logo.png", import.meta.url));
const out = fileURLToPath(new URL("../public/logo.png", import.meta.url));

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;

// background = median of the border pixels
const border = [];
for (let x = 0; x < w; x++) for (const y of [0, h - 1]) border.push((y * w + x) * 4);
for (let y = 0; y < h; y++) for (const x of [0, w - 1]) border.push((y * w + x) * 4);
const med = (c) => border.map((i) => data[i + c]).sort((a, b) => a - b)[border.length >> 1];
const bg = [med(0), med(1), med(2)];

const T0 = 18; // <= this distance: fully transparent
const T1 = 90; // >= this distance: fully opaque
for (let i = 0; i < data.length; i += 4) {
  const d = Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]);
  const a = Math.min(1, Math.max(0, (d - T0) / (T1 - T0)));
  if (a === 0) {
    data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
    continue;
  }
  for (let c = 0; c < 3; c++) {
    data[i + c] = Math.round(Math.min(255, Math.max(0, (data[i + c] - bg[c] * (1 - a)) / a)));
  }
  data[i + 3] = Math.round(a * 255);
}

// trim the now-empty margins
await sharp(data, { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 1 }).png({ compressionLevel: 9 }).toFile(out);
const meta = await sharp(out).metadata();
console.log(`bg rgb(${bg}) -> public/logo.png ${meta.width}x${meta.height}`);
