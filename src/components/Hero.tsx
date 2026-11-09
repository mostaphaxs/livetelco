"use client";

import { useEffect, useRef } from "react";
import { createTimeline, stagger } from "animejs";
import { openFilm } from "./FilmModal";
import { SITES } from "@/lib/locations";
import { prefersReducedMotion } from "@/lib/motion";

// Proof under the headline: the strongest facts, in one row.
const LIVE = SITES.filter((s) => s.kind !== "future");
const IN_DEVELOPMENT = SITES.length - LIVE.length;
const STATS = [
  { value: String(LIVE.length), label: "sites in operation" },
  { value: String(new Set(LIVE.map((s) => s.country)).size), label: "countries" },
  { value: "99.5%", label: "power SLA" },
  { value: "ISO 27001", label: "certified" },
];

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  // The film plays muted while the hero is on screen. It is content, not decoration,
  // so it also plays with "reduce motion" on.
  useEffect(() => {
    const v = video.current!;
    v.muted = true; // React does not reflect `muted` as an attribute; autoplay needs the property
    let onScreen = true;
    const tryPlay = () => onScreen && v.paused && v.play().catch(() => {});
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
        delay: stagger(110),
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
        <div className="relative z-10 max-w-[600px] md:max-w-[min(600px,38vw)]">
          <h1
            data-reveal
            className="max-w-[11.5em] font-display text-[clamp(2.15rem,3.5vw,3.15rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-white"
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
      <button
        type="button"
        onClick={() => openFilm()}
        aria-label="Watch the film (2 min 39)"
        className="group relative mx-[clamp(20px,5vw,96px)] mb-8 block aspect-video cursor-pointer overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white md:absolute md:right-0 md:top-[calc(50%-40px)] md:mx-0 md:mb-0 md:w-[53vw] md:max-w-[1040px] md:-translate-y-1/2 md:rounded-none md:rounded-l-xl"
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
          className="h-full w-full object-cover"
        />
      </button>

      {/* proof: the strongest facts in one row */}
      <div className="relative border-t border-white/10">
        <div data-reveal className="container-x flex flex-col gap-5 py-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 lg:flex lg:gap-x-14">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col">
                <dt className="order-2 text-[13px] text-[#8d9bb0]">{s.label}</dt>
                <dd className="order-1 font-display text-[1.3rem] font-semibold leading-tight tracking-[-0.025em] text-white tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
          <a
            href="#network"
            className="group inline-flex items-center gap-2 self-start py-2 text-sm font-medium text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white lg:self-auto"
          >
            See all {SITES.length} sites, {IN_DEVELOPMENT} in development
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
