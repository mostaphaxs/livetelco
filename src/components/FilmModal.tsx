"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, cubicBezier } from "animejs";
import { prefersReducedMotion } from "@/lib/motion";

const SRC = "/media/livetelco-film-720.mp4";
// `text`: what each chapter shows, for visitors who cannot watch it (the film has music, no voice-over)
const CHAPTERS = [
  { t: 0, label: "The challenge", text: "Building a ground station in a new country means finding land, licences, zoning, power and fibre: a project of 18 to 24 months before the first link." },
  { t: 31, label: "Our network", text: "LiveTelco teleports in operation across 7 countries, with more sites in development." },
  { t: 44, label: "How it works", text: "Satellites link to the operator's antennas inside a LiveTelco site: fence and gate, 24/7 CCTV, shelter and power, and fibre to any carrier." },
  { t: 95, label: "Colocation", text: "A fenced antenna area in a shared teleport, or a whole teleport dedicated to one operator." },
  { t: 110, label: "Security", text: "Anti-climb fence, electronic gate, night-vision CCTV and intrusion alerts sent to the 24/7 NOC." },
  { t: 125, label: "Service level", text: "500 kVA+ of power on a 99.5% SLA, 100G+ redundant fibre, and on-site teams, all followed live in the client portal." },
];

/** Open the LiveTelco film in the player, optionally at a given second. */
export const openFilm = (t = 0) => window.dispatchEvent(new CustomEvent("film:open", { detail: t }));

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

// The player grows out of the hero video ([data-film-origin]) and shrinks back into it.
const ORIGIN = "[data-film-origin]";
// a large move: long, soft landing on the way out; a quicker, even curve on the way back
const EASE_GROW = cubicBezier(0.16, 1, 0.3, 1);
const EASE_SHRINK = cubicBezier(0.65, 0, 0.35, 1);
const GROW_MS = 750;
const SHRINK_MS = 520;

/** The hero video box, if it is on screen (otherwise the player simply fades in). */
function originBox() {
  const el = document.querySelector<HTMLElement>(ORIGIN);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const visible = r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
  return { el, rect: visible ? r : null, video: el.querySelector("video") };
}

/** translate + scale that puts `frame` (top-left origin) exactly over `to`. Measures its untransformed box. */
function flip(frame: HTMLElement, to: DOMRect) {
  const prev = frame.style.transform;
  frame.style.transform = "none";
  const f = frame.getBoundingClientRect();
  frame.style.transform = prev;
  return { x: to.left - f.left, y: to.top - f.top, sx: to.width / f.width, sy: to.height / f.height };
}

export default function FilmModal() {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(0);
  const startAt = useRef(0);
  const root = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const snapshot = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const closing = useRef(false);
  const heroWasPlaying = useRef(false);
  const openAnims = useRef<ReturnType<typeof animate>[]>([]);

  useEffect(() => {
    const onOpen = (e: Event) => {
      startAt.current = (e as CustomEvent<number>).detail || 0;
      lastFocus.current = document.activeElement as HTMLElement;
      closing.current = false;
      setOpen(true);
    };
    window.addEventListener("film:open", onOpen);
    return () => window.removeEventListener("film:open", onOpen);
  }, []);

  /** Shrink back into the hero video, then unmount. */
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    openAnims.current.forEach((a) => a.pause()); // closing mid-grow: shrink from where it is now
    const v = video.current;
    if (v) {
      v.pause();
      v.controls = false; // a clean picture while it shrinks back into the hero
    }
    const o = originBox();
    const done = () => {
      if (o) o.el.style.visibility = "";
      if (o?.video && heroWasPlaying.current) o.video.play().catch(() => {});
      setOpen(false);
    };
    const el = frame.current;
    const chrome = root.current?.querySelectorAll("[data-chrome]");
    if (!el || !backdrop.current || prefersReducedMotion()) {
      if (root.current) animate(root.current, { opacity: 0, duration: 180, ease: "outQuad", onComplete: done });
      else done();
      return;
    }
    if (chrome) animate(chrome, { opacity: 0, duration: 160, ease: "outQuad" });
    animate(backdrop.current, { opacity: 0, duration: SHRINK_MS, ease: EASE_SHRINK });
    if (o?.rect) {
      const { x, y, sx, sy } = flip(el, o.rect);
      animate(el, { translateX: x, translateY: y, scaleX: sx, scaleY: sy, borderRadius: 12 / sx, duration: SHRINK_MS, ease: EASE_SHRINK, onComplete: done });
    } else {
      animate(el, { opacity: 0, scale: 0.94, duration: 260, ease: "outQuad", onComplete: done });
    }
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  // Before the first paint: put the player over the hero video, then grow it to full size.
  useLayoutEffect(() => {
    if (!open) return;
    const el = frame.current!;
    const bd = backdrop.current!;
    const v = video.current!;
    const chrome = root.current!.querySelectorAll<HTMLElement>("[data-chrome]");
    const canvas = snapshot.current!;
    // lock scrolling first: removing the scrollbar shifts the layout, so measure after it
    document.body.style.overflow = "hidden";
    const o = originBox();
    const reduced = prefersReducedMotion();

    v.currentTime = startAt.current;
    const anims: ReturnType<typeof animate>[] = [];
    openAnims.current = anims;
    let onPlaying: (() => void) | null = null;

    // the hero video's current frame sits on top while the player grows, so the picture never jumps;
    // it fades into the film once the film is playing
    const hv = o?.video;
    heroWasPlaying.current = !!hv && !hv.paused;
    let hasSnapshot = false;
    if (!reduced && o?.rect && hv && hv.readyState >= 2 && hv.videoWidth) {
      canvas.width = hv.videoWidth;
      canvas.height = hv.videoHeight;
      try {
        canvas.getContext("2d")!.drawImage(hv, 0, 0);
        hasSnapshot = true;
      } catch {}
    }
    canvas.style.opacity = hasSnapshot ? "1" : "0";
    hv?.pause();

    const startFilm = () => {
      if (hasSnapshot) {
        onPlaying = () => anims.push(animate(canvas, { opacity: 0, duration: 400, ease: "outQuad" }));
        v.addEventListener("playing", onPlaying, { once: true });
      }
      v.play().catch(() => onPlaying?.());
    };

    if (reduced) {
      anims.push(animate(root.current!, { opacity: [0, 1], duration: 200, ease: "outQuad" }));
      startFilm();
    } else {
      // chrome (title, chapters) waits until the picture has nearly landed
      chrome.forEach((c) => (c.style.opacity = "0"));
      bd.style.opacity = "0";
      anims.push(animate(bd, { opacity: [0, 1], duration: 450, ease: "outQuad" }));
      anims.push(animate(chrome, { opacity: [0, 1], translateY: [10, 0], duration: 450, delay: GROW_MS * 0.55, ease: EASE_GROW }));
      if (o?.rect) {
        const { x, y, sx, sy } = flip(el, o.rect);
        o.el.style.visibility = "hidden"; // the hero video "lifts off" the page
        // corners: counter-scaled so they look the same as the hero's while the box is small
        el.style.transform = `translateX(${x}px) translateY(${y}px) scaleX(${sx}) scaleY(${sy})`;
        anims.push(
          animate(el, {
            translateX: [x, 0],
            translateY: [y, 0],
            scaleX: [sx, 1],
            scaleY: [sy, 1],
            borderRadius: [12 / sx, 12],
            duration: GROW_MS,
            ease: EASE_GROW,
            onComplete: startFilm,
          })
        );
      } else {
        el.style.opacity = "0";
        anims.push(animate(el, { opacity: [0, 1], scale: [0.94, 1], duration: 450, ease: EASE_GROW, onComplete: startFilm }));
      }
    }

    root.current!.querySelector<HTMLElement>("[data-close]")?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return closeRef.current();
      if (e.key !== "Tab" || !root.current) return;
      // focus trap: Tab cycles inside the dialog (close button, player, chapters)
      const f = [...root.current.querySelectorAll<HTMLElement>("button, video[controls], summary")];
      const first = f[0];
      const last = f[f.length - 1];
      if (!root.current.contains(document.activeElement)) {
        e.preventDefault();
        first?.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      anims.forEach((a) => a.pause());
      if (onPlaying) v.removeEventListener("playing", onPlaying);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (o) o.el.style.visibility = "";
      v.pause();
      lastFocus.current?.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  // a click on the empty stage (not on the player or the chapters) closes the film
  const onStageClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).hasAttribute("data-dismiss")) close();
  };

  // the player is as large as the screen allows, leaving room for the title and chapters
  const playerWidth = "min(100%, calc((100svh - 190px) * 16 / 9))";

  return (
    <div ref={root} className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="LiveTelco film">
      <div ref={backdrop} className="absolute inset-0 bg-[#05090f]" />
      <div data-dismiss onClick={onStageClick} className="relative flex h-full flex-col items-center overflow-y-auto overscroll-contain px-4 sm:px-8">
        <div data-chrome className="flex w-full items-center justify-between py-4 text-white" style={{ maxWidth: playerWidth }}>
          <div className="font-display text-lg font-semibold">How LiveTelco works</div>
          <button
            data-close
            type="button"
            onClick={close}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            aria-label="Close the film"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div data-dismiss onClick={onStageClick} className="flex w-full flex-1 items-center justify-center">
          <div
            ref={frame}
            className="relative w-full origin-top-left overflow-hidden rounded-xl bg-black shadow-[0_40px_120px_-20px_rgba(0,0,0,.8)] will-change-transform"
            style={{ maxWidth: playerWidth }}
          >
            <video
              ref={video}
              src={SRC}
              poster="/media/film-poster.jpg"
              controls
              playsInline
              preload="auto"
              className="block aspect-video w-full"
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            />
            <canvas ref={snapshot} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
          </div>
        </div>

        <div data-chrome className="w-full pb-6 pt-4" style={{ maxWidth: playerWidth }}>
          <div className="flex flex-wrap gap-2">
            {CHAPTERS.map((c, i) => {
              const active = time >= c.t && time < (CHAPTERS[i + 1]?.t ?? Infinity);
              return (
                <button
                  key={c.t}
                  type="button"
                  onClick={() => {
                    const v = video.current!;
                    v.currentTime = c.t;
                    v.play().catch(() => {});
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                    active ? "bg-white text-[#0b1626]" : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  <span className="tabular-nums font-semibold">{fmt(c.t)}</span> · {c.label}
                </button>
              );
            })}
          </div>
          <details className="mt-4 text-sm text-white/75">
            <summary className="w-fit cursor-pointer rounded font-medium text-white hover:text-[#07b6ff]">Read the film as text</summary>
            <dl className="mt-3 grid max-h-[30vh] gap-3 overflow-y-auto overscroll-contain pr-2">
              {CHAPTERS.map((c) => (
                <div key={c.t}>
                  <dt className="font-semibold text-white">{c.label}</dt>
                  <dd className="mt-0.5 leading-relaxed">{c.text}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>
      </div>
    </div>
  );
}
