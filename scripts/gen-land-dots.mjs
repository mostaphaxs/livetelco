// Generates public/land-dots.bin: evenly spaced points on land, as Int16 pairs
// (lat*100, lon*100). Run with: npm run gen:dots
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { feature } from "topojson-client";
import { geoContains } from "d3-geo";

const topo = JSON.parse(
  readFileSync(new URL("../node_modules/world-atlas/land-50m.json", import.meta.url))
);
const land = feature(topo, topo.objects.land);

const STEP = 1.05; // degrees between rows
const out = [];
for (let lat = -58; lat <= 82; lat += STEP) {
  const ring = Math.max(1, Math.round((360 / STEP) * Math.cos((lat * Math.PI) / 180)));
  for (let i = 0; i < ring; i++) {
    const lon = -180 + (i * 360) / ring;
    if (geoContains(land, [lon, lat])) out.push(Math.round(lat * 100), Math.round(lon * 100));
  }
}

mkdirSync(new URL("../public", import.meta.url), { recursive: true });
writeFileSync(
  new URL("../public/land-dots.bin", import.meta.url),
  Buffer.from(new Int16Array(out).buffer)
);
console.log(`land dots: ${out.length / 2} points, ${out.length * 2} bytes`);
