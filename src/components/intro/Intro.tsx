"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";

/*
  First-visit intro (silent): the opening of the LiveTelco film itself.

  1. public/media/intro.mp4 plays: the first 4.65 s of the film, at its full 1080p60 quality
     (the light streak, the stripe mark, the wordmark, the tagline). Its background is exactly
     the hero colour (#05090f), so the clip has no visible edges at any screen size.
  2. On the last frame the real logo image is placed exactly over the film's logo (LOGO_BOX,
     measured against that frame), the film fades away under it, and the logo flies into the
     navigation bar; the nav logo stays hidden until it lands.

  It is part of the server HTML so the site never flashes before it. An inline script in
  layout.tsx adds to <html> before paint either `intro-active intro-logo-pending` (play it)
  or `no-intro` (already seen → hidden by CSS). Add `?intro` to the URL to replay it.
*/
const KEY = "lt-intro-seen";
const CLIP = "/media/intro.mp4";
const CLIP_MS = 4650;
// where logo.png sits in the film's last frame, in % of the 16:9 frame
const LOGO_BOX = { left: "17.396%", top: "33.426%", width: "62.5%" };

export default function Intro() {
  const [gone, setGone] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const logo = useRef<HTMLImageElement>(null);
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
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    const v = video.current!;
    const img = logo.current!;

    const end = () => {
      html.classList.remove("intro-active");
      window.dispatchEvent(new Event("intro:done"));
    };

    // the logo flies into its place in the navigation bar while the curtain lifts
    const fly = () => {
      const from = img.getBoundingClientRect();
      const nav = document.querySelector<HTMLElement>('header a[aria-label="LiveTelco home"] img');
      const to = nav?.getBoundingClientRect();
      let landed = false;
      const land = () => {
        if (landed) return;
        landed = true;
        html.classList.remove("intro-logo-pending"); // the real nav logo appears exactly underneath
        if (!disposed) setGone(true);
      };
      if (to && to.width > 0 && from.width > 0) {
        animate(img, {
          translateX: to.left + to.width / 2 - (from.left + from.width / 2),
          translateY: to.top + to.height / 2 - (from.top + from.height / 2),
          scale: to.width / from.width,
          duration: 950,
          ease: "outQuart", // leaves the centre at once, settles softly into the nav
        }).then(land);
      } else {
        animate(img, { opacity: 0, duration: 500, ease: "outQuad" });
        later(land, 520);
      }
      // animations pause in background tabs: make sure the hand-over always completes
      later(land, 1400);
      animate(overlay.current!.querySelectorAll("[data-curtain]"), { opacity: 0, duration: 750, delay: 120, ease: "inOutQuad" });
      later(end, 250);
    };

    // Hand-over: the logo image appears exactly over the film's logo, the film fades out
    // under it (nothing moves yet, so there is never a second logo), then it flies.
    let handed = false;
    const handOver = () => {
      if (handed) return;
      handed = true;
      v.pause();
      const atEnd = v.currentTime > CLIP_MS / 1000 - 0.25;
      if (atEnd) img.style.opacity = "1"; // identical to the frame underneath: no visible switch
      else animate(img, { opacity: [0, 1], duration: 220, ease: "outQuad" }); // skipped early
      animate(v, { opacity: 0, duration: 220, ease: "outQuad" });
      later(fly, 230);
    };
    skipRef.current = handOver;

    // Play as soon as the clip can; never leave the visitor waiting on a slow or blocked video.
    let started = false;
    const start = () => {
      if (started || handed) return;
      v.muted = true; // autoplay needs the property, not only the attribute
      v.play().then(
        () => {
          started = true;
          later(handOver, CLIP_MS + 2000); // safety net if `ended` never fires (background tab)
        },
        () => handOver()
      );
    };
    const onEnded = () => handOver();
    const onError = () => handOver();
    v.addEventListener("ended", onEnded);
    v.addEventListener("error", onError);
    v.addEventListener("canplay", start);
    if (v.readyState >= 3) start();
    later(() => {
      if (!started) handOver(); // the clip did not arrive in time: go straight to the site
    }, 3500);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skipRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      disposed = true;
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("keydown", onKey);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("error", onError);
      v.removeEventListener("canplay", start);
    };
  }, []);

  if (gone) return null;

  return (
    <div id="intro" ref={overlay} className="fixed inset-0 z-[200] overflow-hidden">
      <div data-curtain className="absolute inset-0 bg-[#05090f]" />

      {/* the film frame, centred: full width on desktop, never narrower than 520px so the
          logo stays readable on phones (the frame's edges are the page colour) */}
      <div className="absolute left-1/2 top-1/2 aspect-video w-[max(100vw,520px)] -translate-x-1/2 -translate-y-1/2">
        <video
          ref={video}
          data-curtain
          src={CLIP}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          className="h-full w-full"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- must be laid out immediately, no lazy loading */}
        <img
          ref={logo}
          src="/logo.png"
          alt=""
          width={617}
          height={160}
          className="absolute h-auto opacity-0"
          style={LOGO_BOX}
        />
      </div>

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
