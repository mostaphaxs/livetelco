"use client";

import { useEffect, useRef, useState } from "react";
import { createTimeline, stagger } from "animejs";
import { openFilm } from "./FilmModal";
import { SITES } from "@/lib/locations";
import { prefersReducedMotion } from "@/lib/motion";

// Proof under the headline: the strongest facts, as one quiet line of text.
const LIVE = SITES.filter((s) => s.kind !== "future");
const IN_DEVELOPMENT = SITES.length - LIVE.length;
const PROOF = [
  `${LIVE.length} sites in ${new Set(LIVE.map((s) => s.country)).size} countries`,
  "99.5% power SLA",
  "ISO/IEC 27001 certified",
];

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  // the visitor can pause the loop (WCAG 2.2.2: moving content over 5 s needs a pause control)
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const togglePause = () => {
    const v = video.current!;
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    if (pausedRef.current) v.pause();
    else v.play().catch(() => {});
  };

  // The film plays muted while the hero is on screen. It is content, not decoration,
  // so it also plays with "reduce motion" on (with a pause button).
  useEffect(() => {
    const v = video.current!;
    v.muted = true; // React does not reflect `muted` as an attribute; autoplay needs the property
    let onScreen = true;
    const tryPlay = () => onScreen && !pausedRef.current && v.paused && v.play().catch(() => {});
    const io = new IntersectionObserver(
      ([e]) => {
        onScreen = e.isIntersecting;
        if (onScreen) tryPlay();
        else v.pause();
      }
    );
    io.observe(root.current!);
    v.addEventListener("canplay", tryPlay);
    window.addEventListener("pointerdown", tryPlay, { once: true });
    window.addEventListener("scroll", tryPlay, { once: true, passive: true });
    tryPlay();
    return () => {
      io.disconnect();
      v.removeEventListener("canplay", tryPlay);
      window.removeEventListener("pointerdown", tryPlay);
      window.removeEventListener("scroll", tryPlay);
    };
  }, []);

  // One entrance sequence: headline, text, actions, then the country line.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reveal = el.querySelectorAll<HTMLElement>("[data-reveal]");
    if (prefersReducedMotion()) {
      reveal.forEach((n) => (n.style.opacity = "1"));
      return;
    }
    let tl: ReturnType<typeof createTimeline> | null = null;
    const play = () => {
      tl = createTimeline({ defaults: { ease: "outCubic", duration: 900 } }).add(reveal, {
        opacity: [0, 1],
        translateY: [16, 0],
        delay: stagger(70),
      });
    };
    // on a first visit, wait for the intro to hand over
    if (document.documentElement.classList.contains("intro-active")) window.addEventListener("intro:done", play, { once: true });
    else play();
    return () => {
      window.removeEventListener("intro:done", play);
      tl?.revert();
    };
  }, []);

  return (
    <section ref={root} id="top" className="dark relative isolate overflow-hidden !bg-[#05090f] pt-[72px]">
      {/* background = the film's own background colour, so the video sits in it seamlessly */}
      <div className="container-x relative flex items-center pb-10 pt-12 md:min-h-[min(780px,calc(100svh-72px-96px))] md:py-16">
        <div className="relative z-10 max-w-[600px] md:max-w-[min(640px,39vw)]">
          <h1
            data-reveal
            className="max-w-[12em] font-display text-[clamp(2.25rem,3.5vw,3.5rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-white"
          >
            Teleport facilities for LEO satellite operators.
          </h1>
          <p data-reveal className="mt-7 max-w-[34rem] text-[1.0625rem] leading-[1.65] text-[#b9c3d1]">
            Our land, your colocation. We hold the land, licences and zoning in the countries your constellation needs,
            and run the power, fibre, security and on-site teams. You bring the antennas.
          </p>
          <div data-reveal className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
            <a href="#quote" className="btn btn-primary">
              Check site availability
            </a>
            <button
              type="button"
              onClick={() => openFilm()}
              className="group inline-flex items-center gap-3 rounded-md text-[0.95rem] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full border border-white/35 transition-colors group-hover:border-white group-hover:bg-white group-hover:text-[#05090f]">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="ml-0.5">
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
              </span>
              Watch the film (2 min 39)
            </button>
          </div>
        </div>
      </div>

      {/* the LiveTelco film, flush with the right edge (below the copy on phones).
          Clicking it opens the full film, same as the "Watch the film" button. */}
      <div className="relative mx-[clamp(20px,5vw,96px)] mb-8 aspect-video md:absolute md:right-0 md:top-[calc(50%-40px)] md:mx-0 md:mb-0 md:w-[53vw] md:max-w-[1040px] md:-translate-y-1/2">
        <button
          type="button"
          onClick={() => openFilm()}
          aria-label="Watch the film (2 min 39)"
          className="block h-full w-full cursor-pointer overflow-hidden rounded-xl md:rounded-none md:rounded-l-xl"
        >
          <video
            ref={video}
            src="/media/hero-loop.mp4"
            poster="/media/hero-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            className="h-full w-full object-cover"
          />
        </button>
        <button
          type="button"
          onClick={togglePause}
          aria-label={paused ? "Play the background film" : "Pause the background film"}
          className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-[#05090f]/60 text-white backdrop-blur transition-colors hover:border-white/60 hover:bg-[#05090f]/80"
        >
          {paused ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="ml-0.5">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
            </svg>
          )}
        </button>
      </div>

      {/* proof: the strongest facts in one row */}
      <div className="relative border-t border-white/10">
        <div data-reveal className="container-x flex flex-col gap-3 py-5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <p className="text-[#b9c3d1]">
            {PROOF.map((s, i) => (
              <span key={s} className="whitespace-nowrap">
                {i > 0 && <span aria-hidden="true" className="mx-3 inline-block h-3 w-px translate-y-[1px] bg-white/20 align-middle" />}
                {s}
              </span>
            ))}
          </p>
          <a
            href="#network"
            className="self-start whitespace-nowrap py-1 font-medium text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white sm:self-auto"
          >
            See all {SITES.length} sites, {IN_DEVELOPMENT} in development
          </a>
        </div>
      </div>
    </section>
  );
}
