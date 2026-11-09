import { createDrawable, createTimeline, stagger } from "animejs";

/*
  Section entrances. Each section builds its own timeline from these pieces; they all open
  with `signal`, the line of light from the intro crossing the section's top edge.
  Start states live in globals.css (.js [data-anim=...]).
*/
export type Timeline = ReturnType<typeof createTimeline>;
// played 1.7× faster than authored: content must not keep visitors waiting
export const timeline = () => createTimeline({ defaults: { ease: "outCubic" }, playbackRate: 1.7 });
export const q = (el: Element, sel: string) => [...el.querySelectorAll<HTMLElement>(sel)];

/** the signal crosses the top edge of the section */
export function signal(tl: Timeline, el: Element, at = 0) {
  const line = el.querySelector<HTMLElement>("[data-signal]");
  if (!line) return;
  const head = line.querySelector<HTMLElement>(".signal-head")!;
  tl.add(line, { clipPath: ["inset(0% 100% 0% 0%)", "inset(0% 0% 0% 0%)"], duration: 1000, ease: "inOutCubic" }, at)
    .add(head, { opacity: [0, 1], duration: 120, ease: "linear" }, at)
    .add(head, { left: ["0%", "100%"], duration: 1000, ease: "inOutCubic" }, at)
    .add(head, { opacity: 0, duration: 250, ease: "linear" }, at + 900);
}

/** plain fade, staggered (headings, text) */
export const fade = (tl: Timeline, els: HTMLElement[], at: number, gap = 80) =>
  els.length && tl.add(els, { opacity: [0, 1], duration: 700, delay: stagger(gap) }, at);

/** left-to-right wipe, like a signal crossing the element */
export const wipe = (tl: Timeline, els: HTMLElement[], at: number, gap = 120, duration = 1100) =>
  els.length && tl.add(els, { clipPath: ["inset(0% 100% 0% 0%)", "inset(0% 0% 0% 0%)"], duration, ease: "inOutCubic", delay: stagger(gap) }, at);

/** top-to-bottom scan, row by row */
export const scan = (tl: Timeline, els: HTMLElement[], at: number, gap = 90) =>
  els.length && tl.add(els, { clipPath: ["inset(0% 0% 100% 0%)", "inset(0% 0% 0% 0%)"], duration: 450, ease: "outQuad", delay: stagger(gap) }, at);

/** a screen switching on: a bright line opens into the picture */
export const power = (tl: Timeline, els: HTMLElement[], at: number) =>
  els.length &&
  tl
    .add(els, { opacity: [0, 1], duration: 120, ease: "linear" }, at)
    .add(els, { scaleY: [0.015, 1], filter: ["brightness(3)", "brightness(1)"], duration: 650, ease: "outExpo" }, at + 120);

/** a photo developing: blurred and grey, then sharp and in colour */
export const develop = (tl: Timeline, els: HTMLElement[], at: number, gap = 140) =>
  els.length &&
  tl.add(
    els,
    { opacity: [0, 1], filter: ["blur(16px) grayscale(1) brightness(1.6)", "blur(0px) grayscale(0) brightness(1)"], duration: 1200, ease: "outQuad", delay: stagger(gap) },
    at
  );

/** lines growing left to right, one after the other (a progress line) */
export const grow = (tl: Timeline, els: HTMLElement[], at: number, gap = 220) =>
  els.length && tl.add(els, { scaleX: [0, 1], duration: 500, ease: "inOutQuad", delay: stagger(gap) }, at);

/** SVG strokes drawing themselves (ticks, icons) */
export function draw(tl: Timeline, svgs: HTMLElement[], at: number, gap = 160) {
  if (!svgs.length) return;
  tl.add(svgs, { opacity: [0, 1], duration: 1, delay: stagger(gap) }, at);
  const paths = svgs.flatMap((s) => [...s.querySelectorAll<SVGGeometryElement>("path, circle")]);
  tl.add(createDrawable(paths), { draw: ["0 0", "0 1"], duration: 650, ease: "inOutQuad", delay: stagger(gap / 2) }, at);
}

/** numbers counting up to their value (keeps decimals, % and suffixes) */
export function count(tl: Timeline, els: HTMLElement[], at: number) {
  els.forEach((n, i) => {
    const text = n.textContent || "";
    const m = text.match(/[\d.]+/);
    if (!m) return;
    const target = parseFloat(m[0]);
    const dec = (m[0].split(".")[1] || "").length;
    const o = { v: 0 };
    tl.add(o, { v: target, duration: 1100, ease: "outCubic", onUpdate: () => (n.textContent = text.replace(m[0], o.v.toFixed(dec))) }, at + i * 120);
  });
}
