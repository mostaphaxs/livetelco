// Cuts the LiveTelco logo out of its black background:
// info/Logo.jpeg (1376x768, logo on black) -> public/logo.png (transparent, trimmed).
//
// On a black background "colour to alpha" is exact: alpha = brightest channel,
// colour = pixel / alpha. The glow and anti-aliased edges become soft transparency
// instead of being cut off. The noise floor is measured on the image border so
// jpeg grain and the faint vignette in the black end up fully transparent.
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const src = fileURLToPath(new URL("../info/Logo.jpeg", import.meta.url));
const out = fileURLToPath(new URL("../public/logo.png", import.meta.url));
const OUT_HEIGHT = 160; // ~4x the nav display height -> sharp on retina screens

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const mx = (i) => Math.max(data[i], data[i + 1], data[i + 2]);

// noise floor = 99.5th percentile of the brightest channel along a 12px border
const border = [];
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++) if (x < 12 || y < 12 || x >= w - 12 || y >= h - 12) border.push(mx((y * w + x) * 4));
border.sort((a, b) => a - b);
const floor = border[Math.floor(border.length * 0.995)] + 4;

let x0 = w, y0 = h, x1 = 0, y1 = 0;
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const m = mx(i);
    const a = Math.max(0, (m - floor) / (255 - floor));
    if (a <= 0) {
      data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
      continue;
    }
    // un-premultiply against black, then keep the original hue at the new alpha
    for (let c = 0; c < 3; c++) data[i + c] = Math.min(255, Math.round((data[i + c] / m) * 255));
    data[i + 3] = Math.round(a * 255);
    if (a > 0.04) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
}

const pad = 4;
x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);

await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
  .png()
  .toBuffer()
  .then((b) => sharp(b).resize({ height: OUT_HEIGHT, kernel: "lanczos3" }).png({ compressionLevel: 9, palette: false }).toFile(out));

const meta = await sharp(out).metadata();
console.log(`noise floor ${floor}, crop ${x1 - x0 + 1}x${y1 - y0 + 1} -> public/logo.png ${meta.width}x${meta.height}`);
