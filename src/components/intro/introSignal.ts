import { createTimeline } from "animejs";
import { LOGO_STRIPES } from "./logoStripes";
import type { Sfx } from "./sfx";

/*
  Intro "the signal that draws the logo" (≈2.8 s, Canvas 2D, no 3D).

    0.00  a fine line of light crosses the screen; a radio pulse travels along it
    1.00  it fans out into nine lines that bend onto the nine stripes of the globe.
          The target curves are measured from logo.png (logoStripes.ts), so the lines
          land exactly on the real stripes.
    1.75  the real logo is drawn underneath at the same pixels while the lines fade,
          the glare ignites
    2.05  the wordmark slides in
    2.75  the canvas hands over to the <img> logo (identical pixels → no double logo)
*/

const PALETTE = ["#e6409f", "#86d94e", "#ec8fd9", "#a9c6f2", "#eef4ff", "#7fd88f", "#f8a43c", "#f2662c", "#e5302a"];
const CYAN: RGB = [110, 215, 255];
const MARK_W = 0.31; // the globe occupies the left 31% of logo.png
const FLARE = { x: 0.1005, y: 0.406 }; // glare core in logo.png
const N = 64; // points per line

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
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

export function runIntro(host: HTMLElement, logo: HTMLImageElement, sfx: Sfx | null, onReveal: () => void): IntroHandles {
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

  const colors = PALETTE.map(hex);
  const st = { head: 0, pulse: 0, pulseAmp: 0, spread: 0, morph: 0, lines: 1, mark: 0, flare: 0, word: 0 };
  const tl = createTimeline({ autoplay: true })
    .add(st, { head: [0, 1], duration: 800, ease: "inOutSine" }, 0)
    .add(st, { pulse: [0, 1], duration: 900, ease: "linear" }, 250)
    .add(st, { pulseAmp: [0, 1], duration: 300, ease: "outQuad" }, 250)
    .add(st, { pulseAmp: 0, duration: 300, ease: "inQuad" }, 950)
    .add(st, { spread: [0, 1], duration: 350, ease: "outCubic" }, 1000)
    .add(st, { morph: [0, 1], duration: 900, ease: "linear" }, 1000)
    .add(st, { mark: [0, 1], duration: 380, ease: "inOutQuad" }, 1750)
    .add(st, { lines: 0, duration: 380, ease: "inQuad" }, 1800)
    .add(st, { flare: [0, 1, 0], duration: 650, ease: "outQuad" }, 1780)
    .add(st, { word: [0, 1], duration: 650, ease: "inOutCubic" }, 2050);

  const cues: [number, () => void][] = [
    [0, () => sfx?.whoosh(true, 0.8)],
    [380, () => sfx?.ping()],
    [1000, () => sfx?.swell()],
    [1780, () => sfx?.chime()],
  ];
  const timers = cues.map(([t, f]) => window.setTimeout(f, t));
  // hand over to the <img> (same pixels) and lift the curtain
  const handTimer = window.setTimeout(() => {
    logo.style.opacity = "1";
    logo.style.clipPath = "none";
    canvas.style.visibility = "hidden";
  }, 2750);
  const revealTimer = window.setTimeout(onReveal, 2850);

  /* draw ------------------------------------------------------------------- */
  const img = new Image();
  img.src = logo.currentSrc || logo.src;
  const pts = Array.from({ length: N }, () => ({ x: 0, y: 0, w: 1 }));
  const L = Array.from({ length: N }, () => ({ x: 0, y: 0 }));
  const R = Array.from({ length: N }, () => ({ x: 0, y: 0 }));
  const t0 = performance.now();
  let raf = 0;

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

    // the real logo, drawn underneath the lines as they land
    drawLogoPart(0, MARK_W, st.mark);
    if (st.word > 0) {
      const end = MARK_W + (1 - MARK_W) * st.word;
      drawLogoPart(MARK_W, end, Math.min(1, st.word * 1.6), (1 - st.word) * -12);
    }

    ctx.globalCompositeOperation = "lighter";
    const cy = H / 2;
    const gap = Math.min(H * 0.03, 22);
    const amp = Math.min(H * 0.045, 34) * st.pulseAmp;
    const pulseAt = -0.1 + st.pulse * 1.2;

    for (let i = 0; i < 9 && st.lines > 0.001; i++) {
      const m = inOut(clamp01(st.morph * 1.3 - i * 0.033));
      const fan = (i - 4) * gap * st.spread;
      const col = mix(CYAN, colors[i], clamp01(st.spread * 0.5 + m));
      for (let k = 0; k < N; k++) {
        const u = k / (N - 1);
        // the signal: a fine line across the screen, a radio pulse travelling along it
        const d = (u - pulseAt) / 0.07;
        const packet = Math.exp(-d * d) * Math.sin(u * 140 - time * 30);
        const bx = -0.02 * W + u * 1.04 * W;
        const by = cy + fan * (1 - m) + amp * packet;
        const s = sampleStripe(i, u, rect);
        pts[k].x = bx + (s.x - bx) * m;
        pts[k].y = by + (s.y - by) * m;
        pts[k].w = 1.3 + (s.w * 0.88 - 1.3) * m;
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
      const last = Math.max(1, Math.min(N - 1, Math.ceil(st.head * (N - 1))));
      ctx.beginPath();
      ctx.moveTo(L[0].x, L[0].y);
      for (let k = 1; k <= last; k++) ctx.lineTo(L[k].x, L[k].y);
      for (let k = last; k >= 0; k--) ctx.lineTo(R[k].x, R[k].y);
      ctx.closePath();
      // the travelling line fades in from its tail, like a trail
      const tail = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[last].x, pts[last].y);
      const base = (st.spread > 0 ? 0.55 : 0.35) * (1 - m) + m;
      tail.addColorStop(0, rgba(col, 0.05 * (1 - m) + base * m));
      tail.addColorStop(0.6, rgba(col, base * 0.8));
      tail.addColorStop(1, rgba(col, base));
      ctx.globalAlpha = st.lines * (i === 4 || st.spread > 0 ? 1 : 0); // one line until it fans out
      ctx.shadowColor = rgba(col, 0.8);
      ctx.shadowBlur = 10;
      ctx.fillStyle = tail;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // bright head while the signal is crossing
    if (st.head > 0 && st.head < 1) {
      const u = st.head;
      const hx = -0.02 * W + u * 1.04 * W;
      const g = ctx.createRadialGradient(hx, cy, 0, hx, cy, 40);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.18, rgba(CYAN, 0.55));
      g.addColorStop(1, rgba(CYAN, 0));
      ctx.fillStyle = g;
      ctx.fillRect(hx - 40, cy - 40, 80, 80);
      const s = ctx.createLinearGradient(hx - 120, cy, hx + 40, cy);
      s.addColorStop(0, rgba(CYAN, 0));
      s.addColorStop(0.75, "rgba(220,245,255,0.7)");
      s.addColorStop(1, rgba(CYAN, 0));
      ctx.fillStyle = s;
      ctx.fillRect(hx - 120, cy - 0.75, 160, 1.5);
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
  // start once the logo bitmap is decoded, so it can be drawn on the canvas
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    raf = requestAnimationFrame(frame);
  };
  (img.decode ? img.decode() : Promise.resolve()).then(start, start);

  const onResize = () => layout();
  window.addEventListener("resize", onResize);

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    timers.forEach((x) => window.clearTimeout(x));
    window.clearTimeout(revealTimer);
    window.clearTimeout(handTimer);
    window.removeEventListener("resize", onResize);
    tl.pause();
    canvas.remove();
  };

  return {
    skip() {
      tl.pause();
      timers.forEach((x) => window.clearTimeout(x));
      window.clearTimeout(revealTimer);
      window.clearTimeout(handTimer);
      canvas.style.visibility = "hidden";
      onReveal();
    },
    dispose,
  };
}
