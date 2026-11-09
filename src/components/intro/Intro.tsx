"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import type { IntroHandles } from "./introSignal";

/*
  First-visit intro (silent).

  1. The signal leaves the centre of the screen, ripples, splits into nine lines that land on
     the nine stripes of the logo, the glare lights up and the wordmark slides in.
  2. The logo flies into the navigation bar; the nav logo stays hidden until it lands.

  It is part of the server HTML so the site never flashes before it. An inline script in
  layout.tsx adds to <html> before paint either `intro-active intro-logo-pending` (play it)
  or `no-intro` (already seen → hidden by CSS). Add `?intro` to the URL to replay it.
*/
const KEY = "lt-intro-seen";

export default function Intro() {
  const [gone, setGone] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLImageElement>(null);
  const handles = useRef<IntroHandles | null>(null);
  const skipRef = useRef<() => void>(() => {});

  useEffect(() => {
    const html = document.documentElement;
    if (!html.classList.contains("intro-active")) {
      html.classList.remove("intro-logo-pending");
      setGone(true);
      return;
    }
    try {
      localStorage.setItem(KEY, "1");
    } catch {}

    let disposed = false;
    const timers: number[] = [];

    const end = () => {
      html.classList.remove("intro-active");
      window.dispatchEvent(new Event("intro:done"));
    };

    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      // the logo flies into its place in the navigation bar while the curtain lifts
      const img = logo.current!;
      const from = img.getBoundingClientRect();
      const nav = document.querySelector<HTMLElement>('header a[aria-label="LiveTelco home"] img');
      const to = nav?.getBoundingClientRect();
      let landed = false;
      const land = () => {
        if (landed) return;
        landed = true;
        html.classList.remove("intro-logo-pending"); // the real nav logo appears exactly underneath
        handles.current?.dispose();
        if (!disposed) setGone(true);
      };
      if (to && to.width > 0 && from.width > 0) {
        animate(img, {
          translateX: to.left + to.width / 2 - (from.left + from.width / 2),
          translateY: to.top + to.height / 2 - (from.top + from.height / 2),
          scale: to.width / from.width,
          opacity: 1, // in case the intro was skipped before the logo appeared
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 950,
          ease: "outQuart", // leaves the centre at once, settles softly into the nav
        }).then(land);
      } else {
        animate(img, { opacity: 0, duration: 500, ease: "outQuad" });
        timers.push(window.setTimeout(land, 520));
      }
      // animations pause in background tabs: make sure the hand-over always completes
      timers.push(window.setTimeout(land, 1400));
      animate(overlay.current!.querySelectorAll("[data-curtain]"), { opacity: 0, duration: 750, delay: 120, ease: "inOutQuad" });
      timers.push(window.setTimeout(end, 250));
    };
    skipRef.current = () => (handles.current ? handles.current.skip() : reveal());

    import("./introSignal")
      .then(({ runIntro }) => {
        if (disposed) return;
        try {
          handles.current = runIntro(stage.current!, logo.current!, reveal);
        } catch {
          animate(logo.current!, { opacity: [0, 1], clipPath: "inset(0% 0% 0% 0%)", duration: 700, ease: "outQuad" });
          timers.push(window.setTimeout(reveal, 1600));
        }
      })
      .catch(() => {
        html.classList.remove("intro-logo-pending");
        end();
        setGone(true);
      });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skipRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      disposed = true;
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("keydown", onKey);
      handles.current?.dispose();
    };
  }, []);

  if (gone) return null;

  return (
    <div id="intro" ref={overlay} className="fixed inset-0 z-[200] overflow-hidden">
      <div data-curtain className="absolute inset-0 bg-[#05090f]" />
      <div data-curtain ref={stage} className="absolute inset-0" aria-hidden="true" />

      {/* eslint-disable-next-line @next/next/no-img-element -- must be laid out immediately, no lazy loading */}
      <img
        ref={logo}
        src="/logo.png"
        alt=""
        width={617}
        height={160}
        className="absolute left-1/2 top-1/2 w-[min(640px,84vw)] -translate-x-1/2 -translate-y-1/2 opacity-0"
        style={{ clipPath: "inset(0% 72% 0% 0%)" }}
      />

      <div data-curtain className="absolute bottom-6 right-6">
        <button
          type="button"
          onClick={() => skipRef.current()}
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white/75 transition-colors hover:border-white/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Skip intro
        </button>
      </div>
    </div>
  );
}
