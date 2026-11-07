import { createTimeline } from "animejs";
import { LOGO_STRIPES } from "./logoStripes";

/*
  Intro "the signal that draws the logo" (≈4.3 s, Canvas 2D, no 3D).

    0.00  a fine line of light crosses the screen; a radio pulse travels along it
    1.00  it fans out into nine lines that bend onto the nine stripes of the globe.
          The target curves are measured from logo.png (logoStripes.ts), so the lines
          land exactly on the real stripes.
    1.00–3.00 slowly, one after the other, each line bends onto its place and dissolves into its own real stripe: the nine stripes are cut out
          of logo.png (exact pixels) and each one fades in exactly under its line
    2.85  the glare ignites, once the globe is complete (the rest of the globe artwork: the glare itself)
    3.30  the wordmark slides in
    4.25  the canvas hands over to the <img> logo (identical pixels → no double logo)
*/

const CYAN: RGB = [110, 215, 255];
const MARK_W = 0.31; // the globe occupies the left 31% of logo.png
const FLARE = { x: 0.1005, y: 0.406 }; // glare core in logo.png
const N = 64; // points per line

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** sample a measured stripe at parameter u (0..1): screen x, y and thickness */
function sampleStripe(i: number, u: number, rect: DOMRect | { left: number; top: number; width: number; height: number }) {
  const pts = LOGO_STRIPES[i].pts;
  const f = u * (pts.length - 1);
  const a = pts[Math.floor(f)];
  const b = pts[Math.min(pts.length - 1, Math.floor(f) + 1)];
  const t = f - Math.floor(f);
  return {
    x: rect.left + (a[0] + (b[0] - a[0]) * t) * rect.width,
    y: rect.top + (a[1] + (b[1] - a[1]) * t) * rect.height,
    w: (a[2] + (b[2] - a[2]) * t) * rect.height,
  };
}

export interface IntroHandles {
  skip(): void;
  dispose(): void;
}

export function runIntro(host: HTMLElement, logo: HTMLImageElement, onReveal: () => void): IntroHandles {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
  host.prepend(canvas);
  const ctx = canvas.getContext("2d")!;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  let W = 0;
  let H = 0;
  let rect = { left: 0, top: 0, width: 1, height: 1 };
  const layout = () => {
    W = host.clientWidth || window.innerWidth;
    H = host.clientHeight || window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const r = logo.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    rect = { left: r.left - h.left, top: r.top - h.top, width: r.width, height: r.height };
  };
  layout();

  // each line flies in the real average colour of its stripe
  const colors = LOGO_STRIPES.map((s) => hex(s.color));
  const st = { head: 0, pulse: 0, pulseAmp: 0, spread: 0, morph: 0, mark: 0, flare: 0, word: 0 };
  const tl = createTimeline({ autoplay: true })
    .add(st, { head: [0, 1], duration: 750, ease: "outCubic" }, 0)
    .add(st, { pulse: [0, 1], duration: 900, ease: "linear" }, 250)
    .add(st, { pulseAmp: [0, 1], duration: 300, ease: "outQuad" }, 250)
    .add(st, { pulseAmp: 0, duration: 300, ease: "inQuad" }, 950)
    .add(st, { spread: [0, 1], duration: 350, ease: "outCubic" }, 1000)
    .add(st, { morph: [0, 1], duration: 2000, ease: "linear" }, 1000)
    .add(st, { mark: [0, 1], duration: 500, ease: "inOutQuad" }, 2850)
    .add(st, { flare: [0, 1, 0], duration: 800, ease: "outQuad" }, 2900)
    .add(st, { word: [0, 1], duration: 750, ease: "inOutCubic" }, 3300);

  // hand over to the <img> (same pixels) and lift the curtain
  const handTimer = window.setTimeout(() => {
    logo.style.opacity = "1";
    logo.style.clipPath = "none";
    canvas.style.visibility = "hidden";
  }, 4250);
  const revealTimer = window.setTimeout(onReveal, 4350);

  // dev only: ?intro&introAt=2400 freezes the intro at that millisecond (to inspect frames)
  let frozen = false;
  if (process.env.NODE_ENV !== "production") {
    const at = new URLSearchParams(location.search).get("introAt");
    if (at) {
      frozen = true;
      window.clearTimeout(handTimer);
      window.clearTimeout(revealTimer);
      tl.seek(Number(at));
      tl.pause();
    }
  }

  /* draw ------------------------------------------------------------------- */
  const img = new Image();
  img.src = logo.currentSrc || logo.src;
  const pts = Array.from({ length: N }, () => ({ x: 0, y: 0, w: 1 }));
  const L = Array.from({ length: N }, () => ({ x: 0, y: 0 }));
  const R = Array.from({ length: N }, () => ({ x: 0, y: 0 }));
  const t0 = performance.now();
  let raf = 0;

  /* the globe cut into layers from logo.png: one per stripe + the rest (the glare).
     The layers are disjoint, so drawn together (additively) they rebuild logo.png exactly. */
  let stripeLayers: HTMLCanvasElement[] = [];
  let restLayer: HTMLCanvasElement | null = null;
  const ribbon = (x: CanvasRenderingContext2D, i: number, w: number, h: number) => {
    const p = LOGO_STRIPES[i].pts;
    const n = p.length;
    const Lp: [number, number][] = [];
    const Rp: [number, number][] = [];
    for (let k = 0; k < n; k++) {
      const a = p[Math.max(0, k - 1)];
      const b = p[Math.min(n - 1, k + 1)];
      const tx = (b[0] - a[0]) * w;
      const ty = (b[1] - a[1]) * h;
      const tl = Math.hypot(tx, ty) || 1;
      const nx = -ty / tl;
      const ny = tx / tl;
      const hw = (p[k][2] * h * 1.35) / 2 + 1.5; // generous: covers anti-aliased edges
      const ext = k === 0 ? -3 : k === n - 1 ? 3 : 0; // reach a little past the tips
      const cx = p[k][0] * w + (tx / tl) * ext;
      const cy = p[k][1] * h + (ty / tl) * ext;
      Lp.push([cx + nx * hw, cy + ny * hw]);
      Rp.push([cx - nx * hw, cy - ny * hw]);
    }
    x.beginPath();
    x.moveTo(Lp[0][0], Lp[0][1]);
    for (const q of Lp.slice(1)) x.lineTo(q[0], q[1]);
    for (const q of Rp.reverse()) x.lineTo(q[0], q[1]);
    x.closePath();
  };
  const buildLayers = () => {
    if (!img.naturalWidth) return;
    const w = rect.width;
    const h = rect.height;
    const make = () => {
      const cv = document.createElement("canvas");
      cv.width = Math.ceil(w * DPR);
      cv.height = Math.ceil(h * DPR);
      const x = cv.getContext("2d")!;
      x.scale(DPR, DPR);
      return [cv, x] as const;
    };
    const [used, ux] = make(); // union of the stripe masks so far
    stripeLayers = LOGO_STRIPES.map((_, i) => {
      const [cv, x] = make();
      ribbon(x, i, w, h);
      x.fillStyle = "#000";
      x.fill();
      x.globalCompositeOperation = "destination-out"; // keep the layers disjoint
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.drawImage(used, 0, 0);
      x.setTransform(DPR, 0, 0, DPR, 0, 0);
      x.globalCompositeOperation = "source-in";
      x.drawImage(img, 0, 0, w, h);
      ribbon(ux, i, w, h);
      ux.fillStyle = "#000";
      ux.fill();
      return cv;
    });
    const [rest, rx] = make();
    rx.drawImage(img, 0, 0, img.naturalWidth * MARK_W, img.naturalHeight, 0, 0, w * MARK_W, h);
    rx.globalCompositeOperation = "destination-out";
    rx.setTransform(1, 0, 0, 1, 0, 0);
    rx.drawImage(used, 0, 0);
    restLayer = rest;
  };
  const drawLayer = (layer: HTMLCanvasElement | null, alpha: number) => {
    if (!layer || alpha <= 0.001) return;
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(layer, rect.left, rect.top, rect.width, rect.height);
    ctx.globalAlpha = 1;
  };

  const drawLogoPart = (from: number, to: number, alpha: number, dx = 0) => {
    if (alpha <= 0.001 || !img.complete || to <= from) return;
    ctx.globalAlpha = alpha;
    const sx = from * img.naturalWidth;
    const sw = (to - from) * img.naturalWidth;
    ctx.drawImage(img, sx, 0, sw, img.naturalHeight, rect.left + from * rect.width + dx, rect.top, (to - from) * rect.width, rect.height);
    ctx.globalAlpha = 1;
  };

  const frame = (now: number) => {
    const time = (now - t0) / 1000;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, W, H);

    // the real stripes, each fading in exactly under its own line as it lands
    ctx.globalCompositeOperation = "lighter"; // disjoint layers add up to the exact image
    for (let i = 0; i < stripeLayers.length; i++) {
      const m = inOut(clamp01(st.morph * 1.5 - i * 0.0625));
      drawLayer(stripeLayers[i], smooth(0.45, 1, m));
    }
    drawLayer(restLayer, st.mark); // the glare
    ctx.globalCompositeOperation = "source-over";
    if (st.word > 0) {
      const end = MARK_W + (1 - MARK_W) * st.word;
      drawLogoPart(MARK_W, end, Math.min(1, st.word * 1.6), (1 - st.word) * -12);
    }

    ctx.globalCompositeOperation = "lighter";
    const cy = H / 2;
    const gap = Math.min(H * 0.03, 22);
    const amp = Math.min(H * 0.045, 34) * st.pulseAmp;
    const pulseAt = 0.5 + st.pulse * 0.6; // from the centre to beyond the right edge

    for (let i = 0; i < 9; i++) {
      const m = inOut(clamp01(st.morph * 1.5 - i * 0.0625));
      const fan = (i - 4) * gap * st.spread;
      const col = mix(CYAN, colors[i], clamp01(st.spread * 0.5 + m));
      for (let k = 0; k < N; k++) {
        const u = k / (N - 1);
        // the signal: a fine line across the screen, a radio pulse travelling along it
        const d = (u - pulseAt) / 0.07;
        const packet = Math.exp(-d * d) * Math.sin(u * 140 - time * 30);
        // the pulse travels outwards on both sides of the centre
        const d2 = (u - (1 - pulseAt)) / 0.07;
        const mirror = Math.exp(-d2 * d2) * Math.sin(u * 140 + time * 30);
        const bx = -0.02 * W + u * 1.04 * W;
        const by = cy + fan * (1 - m) + amp * (packet + mirror);
        const s = sampleStripe(i, u, rect);
        pts[k].x = bx + (s.x - bx) * m;
        pts[k].y = by + (s.y - by) * m;
        pts[k].w = 2 + (s.w * 0.88 - 2) * m;
      }
      for (let k = 0; k < N; k++) {
        const a = pts[Math.max(0, k - 1)];
        const b = pts[Math.min(N - 1, k + 1)];
        let nx = a.y - b.y;
        let ny = b.x - a.x;
        const len = Math.hypot(nx, ny) || 1;
        nx /= len;
        ny /= len;
        const hw = pts[k].w / 2;
        L[k].x = pts[k].x + nx * hw;
        L[k].y = pts[k].y + ny * hw;
        R[k].x = pts[k].x - nx * hw;
        R[k].y = pts[k].y - ny * hw;
      }
      const half = (st.head * (N - 1)) / 2;
      const first = Math.max(0, Math.floor((N - 1) / 2 - half));
      const last = Math.min(N - 1, Math.max(first + 1, Math.ceil((N - 1) / 2 + half)));
      ctx.beginPath();
      ctx.moveTo(L[first].x, L[first].y);
      for (let k = first + 1; k <= last; k++) ctx.lineTo(L[k].x, L[k].y);
      for (let k = last; k >= first; k--) ctx.lineTo(R[k].x, R[k].y);
      ctx.closePath();
      // brighter at both travelling ends, like two wavefronts leaving the centre
      const tail = ctx.createLinearGradient(pts[first].x, pts[first].y, pts[last].x, pts[last].y);
      const base = (st.spread > 0 ? 0.85 : 0.9) * (1 - m) + m;
      tail.addColorStop(0, rgba(col, base));
      tail.addColorStop(0.5, rgba(col, base * (0.7 + 0.3 * m)));
      tail.addColorStop(1, rgba(col, base));
      // one line until it fans out; each line hands over to its real stripe as it lands
      ctx.globalAlpha = (i === 4 || st.spread > 0 ? 1 : 0) * (1 - smooth(0.72, 1, m));
      ctx.shadowColor = rgba(col, 0.8);
      ctx.shadowBlur = 14;
      ctx.fillStyle = tail;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // bright head while the signal is crossing
    if (st.head > 0 && st.head < 1) {
      for (const side of [-1, 1]) {
        const u = 0.5 + (side * st.head) / 2;
        const hx = -0.02 * W + u * 1.04 * W;
        const g = ctx.createRadialGradient(hx, cy, 0, hx, cy, 40);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.18, rgba(CYAN, 0.55));
        g.addColorStop(1, rgba(CYAN, 0));
        ctx.fillStyle = g;
        ctx.fillRect(hx - 40, cy - 40, 80, 80);
        const s = ctx.createLinearGradient(hx - 120 * side, cy, hx + 40 * side, cy);
        s.addColorStop(0, rgba(CYAN, 0));
        s.addColorStop(0.75, "rgba(220,245,255,0.7)");
        s.addColorStop(1, rgba(CYAN, 0));
        ctx.fillStyle = s;
        ctx.fillRect(Math.min(hx - 120 * side, hx + 40 * side), cy - 0.75, 160, 1.5);
      }
    }

    // the glare ignites on the real logo's glare
    if (st.flare > 0.001) {
      const fx = rect.left + FLARE.x * rect.width;
      const fy = rect.top + FLARE.y * rect.height;
      const r = rect.height * (0.35 + 0.35 * st.flare);
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r);
      g.addColorStop(0, `rgba(255,255,255,${st.flare})`);
      g.addColorStop(0.25, `rgba(255,214,150,${0.6 * st.flare})`);
      g.addColorStop(1, "rgba(255,120,60,0)");
      ctx.fillStyle = g;
      ctx.fillRect(fx - r, fy - r, r * 2, r * 2);
      const sw = rect.height * 1.6 * st.flare;
      const s = ctx.createLinearGradient(fx - sw, fy, fx + sw, fy);
      s.addColorStop(0, "rgba(255,200,140,0)");
      s.addColorStop(0.5, `rgba(255,245,230,${0.9 * st.flare})`);
      s.addColorStop(1, "rgba(255,200,140,0)");
      ctx.fillStyle = s;
      ctx.fillRect(fx - sw, fy - 1, sw * 2, 2);
    }
    raf = requestAnimationFrame(frame);
  };
  // the draw loop
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    raf = requestAnimationFrame(frame);
  };
  // start once the logo bitmap is loaded (img.decode() can stall in background tabs)
  let ready = false;
  const go = () => {
    if (ready) return;
    ready = true;
    buildLayers();
    start();
    if (frozen) frame(performance.now()); // draw now, even if the page is not being painted
  };
  if (img.complete && img.naturalWidth) go();
  else {
    img.addEventListener("load", () => (ready ? buildLayers() : go()), { once: true }); // late load: (re)build the layers
    img.addEventListener("error", go, { once: true });
  }
  const goTimer = window.setTimeout(go, 600);

  const onResize = () => {
    layout();
    buildLayers();
  };
  window.addEventListener("resize", onResize);

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(revealTimer);
    window.clearTimeout(handTimer);
    window.clearTimeout(goTimer);
    window.removeEventListener("resize", onResize);
    tl.pause();
    canvas.remove();
  };

  return {
    skip() {
      tl.pause();
      window.clearTimeout(revealTimer);
      window.clearTimeout(handTimer);
      canvas.style.visibility = "hidden";
      onReveal();
    },
    dispose,
  };
}
