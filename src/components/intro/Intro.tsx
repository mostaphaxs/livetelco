"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import type { Sfx } from "./sfx";

/*
  First-visit intro overlay: a line of light (a radio signal) draws the LiveTelco globe,
  then the logo appears and flies into the navigation bar.

  It is part of the server HTML so the site never flashes before it. An inline script in
  layout.tsx adds to <html> before paint either
    - `intro-active intro-logo-pending` (play it; the nav logo stays hidden), or
    - `no-intro` (already seen → hidden by CSS).
  Add `?intro` to the URL to replay it.
*/
const KEY = "lt-intro-seen";

export default function Intro() {
  const [gone, setGone] = useState(false);
  const [sound, setSound] = useState<"off" | "on" | "none">("off");
  const overlay = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLImageElement>(null);
  const skipRef = useRef<() => void>(() => {});
  const sfxRef = useRef<Sfx | null>(null);
  const mutedRef = useRef(false);

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
    let handles: { skip(): void; dispose(): void } | null = null;
    const timers: number[] = [];

    // sound: browsers only allow it after a gesture; any tap / key during the intro enables it
    const enableSound = () => {
      const s = sfxRef.current;
      if (!s || mutedRef.current) return;
      s.unlock().then(() => {
        if (!disposed && s.enabled) {
          setSound("on");
        }
      });
    };
    window.addEventListener("pointerdown", enableSound);
    window.addEventListener("keydown", enableSound);

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
        handles?.dispose();
        sfxRef.current?.dispose();
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
        animate(img, { opacity: 0, duration: 500, ease: "inQuad" });
        timers.push(window.setTimeout(land, 520));
      }
      // animations pause in background tabs: make sure the hand-over always completes
      timers.push(window.setTimeout(land, 1400));
      animate(overlay.current!.querySelectorAll("[data-curtain]"), { opacity: 0, duration: 750, delay: 120, ease: "inOutQuad" });
      timers.push(window.setTimeout(end, 250));
    };

    Promise.all([import("./introSignal"), import("./sfx")])
      .then(([{ runIntro }, { createSfx }]) => {
        if (disposed) return;
        try {
          sfxRef.current = createSfx();
          if (!sfxRef.current) setSound("none");
          else if (sfxRef.current.enabled) setSound("on");
        } catch {
          setSound("none");
        }
        try {
          handles = runIntro(stage.current!, logo.current!, sfxRef.current, reveal);
          skipRef.current = () => handles?.skip();
        } catch {
          // no WebGL: simple logo fade instead
          animate(logo.current!, { opacity: [0, 1], clipPath: "inset(0% 0% 0% 0%)", duration: 700, ease: "outQuad" });
          timers.push(window.setTimeout(reveal, 1600));
          skipRef.current = reveal;
        }
      })
      .catch(() => {
        html.classList.remove("intro-logo-pending");
        end();
        setGone(true);
      });

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && skipRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      disposed = true;
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", enableSound);
      window.removeEventListener("keydown", enableSound);
      handles?.dispose();
    };
  }, []);

  if (gone) return null;

  return (
    <div id="intro" ref={overlay} className="fixed inset-0 z-[200] overflow-hidden">
      <div data-curtain className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,#10223d_0%,#060d18_65%)]" />
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
      <div data-curtain className="absolute bottom-6 right-6 flex items-center gap-2">
        {sound !== "none" && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              const s = sfxRef.current;
              if (!s) return;
              if (sound === "on") {
                mutedRef.current = true;
                s.mute(true);
                setSound("off");
              } else {
                mutedRef.current = false;
                s.mute(false);
                s.unlock().then(() => s.enabled && setSound("on"));
              }
            }}
            className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white/75 transition-colors hover:border-white/50 hover:text-white"
            aria-label={sound === "on" ? "Sound is on" : "Turn sound on"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
              {sound === "on" ? (
                <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              ) : (
                <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              )}
            </svg>
            {sound === "on" ? "Sound on" : "Tap for sound"}
          </button>
        )}
        <button
          type="button"
          onClick={() => skipRef.current()}
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white/75 transition-colors hover:border-white/50 hover:text-white"
        >
          Skip intro
        </button>
      </div>
    </div>
  );
}
