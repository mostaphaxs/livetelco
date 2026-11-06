// Removes the flat dark background from info/logo.png -> public/logo.png (fully transparent bg).
// Exact "colour to alpha": each pixel p is split into p = a*fg + (1-a)*bg with the
// smallest alpha that keeps fg inside [0,255]. Nothing is thresholded away, so thin
// strokes, anti-aliased edges and the darker parts of the globe all survive, and
// the logo looks identical to the original when placed back on its own background.
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

const NOISE = 4 / 255; // ignore jpeg-ish speckle in the flat background
for (let i = 0; i < data.length; i += 4) {
  let a = 0;
  for (let c = 0; c < 3; c++) {
    const p = data[i + c], b = bg[c];
    const ac = p > b ? (p - b) / (255 - b) : p < b ? (b - p) / b : 0;
    if (ac > a) a = ac;
  }
  a = a <= NOISE ? 0 : Math.min(1, a * (data[i + 3] / 255));
  if (a === 0) {
    data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
    continue;
  }
  for (let c = 0; c < 3; c++) {
    data[i + c] = Math.round(Math.min(255, Math.max(0, (data[i + c] - bg[c] * (1 - a)) / a)));
  }
  data[i + 3] = Math.round(a * 255);
}

await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .trim({ threshold: 1 })
  .png({ compressionLevel: 9 })
  .toFile(out);
const meta = await sharp(out).metadata();
console.log(`bg rgb(${bg}) -> public/logo.png ${meta.width}x${meta.height}`);
