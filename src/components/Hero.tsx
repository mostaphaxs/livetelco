"use client";

import { useEffect, useRef } from "react";
import { createTimeline, stagger } from "animejs";
import { openFilm } from "./FilmModal";
import { SITES } from "@/lib/locations";
import { prefersReducedMotion } from "@/lib/motion";

// Proof under the headline: the countries where sites are in operation, with how many.
const LIVE = SITES.filter((s) => s.kind !== "future");
const COUNTRIES = [...new Set(LIVE.map((s) => s.country))].map((c) => ({ name: c, sites: LIVE.filter((s) => s.country === c).length }));
const IN_DEVELOPMENT = SITES.length - LIVE.length;

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
      },
      { threshold: 0.05 }
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
      <div className="container-x relative flex min-h-[min(760px,calc(100svh-72px-96px))] items-center py-16">
        <div className="relative z-10 max-w-[600px] md:max-w-[min(520px,37vw)]">
          <h1
            data-reveal
            className="max-w-[11.5em] font-display text-[clamp(2.4rem,3.9vw,3.5rem)] font-medium leading-[1.04] tracking-[-0.035em] text-white"
          >
            Teleport facilities for LEO satellite operators.
          </h1>
          <p data-reveal className="mt-7 max-w-[33rem] text-[1.075rem] leading-[1.7] text-[#b9c3d1]">
            Our land, your colocation. We hold the land, licences and zoning in the countries your constellation needs,
            and run the power, fibre, security and on-site teams. You bring the antennas.
          </p>
          <div data-reveal className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
            <a href="#quote" className="btn btn-primary">
              Get a quote
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

      {/* the LiveTelco film, flush with the right edge (below the copy on phones) */}
      <div
        aria-hidden="true"
        className="relative mx-[clamp(20px,4vw,40px)] mb-10 aspect-video overflow-hidden rounded-xl md:absolute md:right-0 md:top-[calc(50%-24px)] md:mx-0 md:mb-0 md:w-[50vw] md:max-w-[1000px] md:-translate-y-1/2 md:rounded-none md:rounded-l-xl"
      >
        <video
          ref={video}
          src="/media/hero-loop.mp4"
          poster="/media/hero-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="h-full w-full object-cover"
        />
      </div>

      {/* proof: where the sites are, and how many in each country */}
      <div className="relative border-t border-white/10">
        <div data-reveal className="container-x flex flex-wrap items-baseline gap-x-10 gap-y-4 py-7">
          <p className="w-full text-sm text-[#8d9bb0] lg:w-auto">Sites in operation, by country</p>
          <ul className="flex flex-1 flex-wrap items-baseline gap-x-7 gap-y-2" aria-label="Countries with sites in operation">
            {COUNTRIES.map((c) => (
              <li key={c.name} className="font-display text-[1.15rem] font-medium tracking-[-0.01em] text-white">
                {c.name}
                <sup className="ml-0.5 text-[0.62em] font-semibold text-[#3fc5ff]" aria-label={`${c.sites} sites`}>
                  {c.sites}
                </sup>
              </li>
            ))}
          </ul>
          <a href="#network" className="text-sm font-medium text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white">
            See all {SITES.length} sites, {IN_DEVELOPMENT} in development
          </a>
        </div>
      </div>
    </section>
  );
}
