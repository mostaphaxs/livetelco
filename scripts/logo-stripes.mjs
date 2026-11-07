import sharp from "sharp";
// Measures the nine stripes of the logo globe (centre line + thickness per column).
// Usage: node scripts/logo-stripes.mjs <glare radius> <brightness threshold> <preview.png> [out.json]
const { data, info } = await sharp("public/logo.png").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, X1 = 186;
const FX = 62, FY = 65, FR = Number(process.argv[2] || 20); // flare centre / exclusion radius
const A = Number(process.argv[3] || 190);
const mask = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < X1; x++) {
  const i = (y * W + x) * 4;
  const r = data[i], g = data[i + 1], b = data[i + 2], al = data[i + 3] / 255;
  if (al * Math.max(r, g, b) < A) continue; // visible brightness on black
  const d = Math.hypot(x - FX, y - FY);
  if (d < FR) continue;
  const warm = r > 170 && b < 0.62 * r && g > b && g < 0.95 * r; // orange/yellow glare
  if (warm && d < 52) continue;
  mask[y * W + x] = 1;
}
// connected components (4-neighbour)
const lab = new Int32Array(W * H).fill(-1); const comps = [];
for (let y = 0; y < H; y++) for (let x = 0; x < X1; x++) {
  const p = y * W + x; if (!mask[p] || lab[p] >= 0) continue;
  const id = comps.length, stack = [p], px = []; lab[p] = id;
  while (stack.length) { const q = stack.pop(); px.push(q); const qx = q % W, qy = (q / W) | 0;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= X1 || ny >= H) continue; const n = ny * W + nx; if (mask[n] && lab[n] < 0) { lab[n] = id; stack.push(n); } } }
  comps.push(px);
}
const big = comps.filter((c) => c.length > 60).map((c) => {
  const cols = new Map(); let r = 0, g = 0, b = 0;
  for (const q of c) { const x = q % W, y = (q / W) | 0; const e = cols.get(x) || [0, 0, 1e9, -1e9]; e[0] += y; e[1]++; e[2] = Math.min(e[2], y); e[3] = Math.max(e[3], y); cols.set(x, e); const i = q * 4; r += data[i]; g += data[i + 1]; b += data[i + 2]; }
  const xs = [...cols.keys()].sort((a, b) => a - b);
  const line = xs.map((x) => { const e = cols.get(x); return [x, e[0] / e[1], e[3] - e[2] + 1]; });
  const my = c.reduce((s, q) => s + ((q / W) | 0), 0) / c.length;
  return { n: c.length, my, color: [r, g, b].map((v) => Math.round(v / c.length)), line };
}).sort((a, b) => a.my - b.my);
console.log("components:", big.length, big.map((c) => `${c.n}px y${c.my.toFixed(0)} rgb(${c.color}) x${c.line[0][0]}-${c.line.at(-1)[0]}`).join("\n"));
// overlay preview
const S = 4; let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${190 * S}" height="${H * S}">`;
for (const c of big) svg += `<polyline fill="none" stroke="white" stroke-width="2" points="${c.line.map(([x, y]) => `${x * S},${y * S}`).join(" ")}"/>`;
svg += "</svg>";
const base = await sharp("public/logo.png").extract({ left: 0, top: 0, width: 190, height: H }).resize(190 * S, H * S, { kernel: "nearest" }).flatten({ background: "#060d18" }).toBuffer();
await sharp(base).composite([{ input: Buffer.from(svg) }]).toFile(process.argv[4]);
if (process.argv[5]) (await import("node:fs")).writeFileSync(process.argv[5], JSON.stringify(big.map((c) => ({ color: c.color, line: c.line }))));
