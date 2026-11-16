"use client";

import { useEffect, useRef, useState } from "react";
import { createTimeline, stagger } from "animejs";
import { openFilm } from "./FilmModal";
import SiteTicker from "./SiteTicker";
import Words from "./Words";
import { SITES } from "@/lib/locations";
import { EASE_OUT, prefersReducedMotion } from "@/lib/motion";
import { useMagnet } from "@/lib/spotlight";

const HEADLINE = "Teleport facilities for LEO satellite operators.";
const LIVE = SITES.filter((s) => s.kind !== "future");
const IN_DEVELOPMENT = SITES.length - LIVE.length;

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const film = useRef<HTMLDivElement>(null);
  const actions = useMagnet<HTMLDivElement>();
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

  // The film drifts a little slower than the page while the hero scrolls away (transform only).
  useEffect(() => {
    const el = film.current;
    if (!el || prefersReducedMotion() || !window.matchMedia("(min-width: 768px)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = Math.min(window.scrollY, 900);
      // a variable, not `translate`: the box is centred with Tailwind's -translate-y-1/2, which is
      // the same CSS property, so setting it inline would drop the centring and push the film down
      el.style.setProperty("--drift", `${y * 0.1}px`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      el.style.removeProperty("--drift");
    };
  }, []);

  // Entrance, one wave: the headline words rise out of their lines (lead), the text and
  // actions follow with a smaller rise (support), the proof line and the film only fade.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const h1 = el.querySelector<HTMLElement>(".h-words")!;
    const words = h1.querySelectorAll<HTMLElement>(".w > span");
    const support = el.querySelectorAll<HTMLElement>("[data-reveal]");
    const deco = el.querySelectorAll<HTMLElement>("[data-reveal-fade]");
    if (prefersReducedMotion()) {
      h1.removeAttribute("data-pending");
      [...support, ...deco].forEach((n) => (n.style.opacity = "1"));
      return;
    }
    let tl: ReturnType<typeof createTimeline> | null = null;
    const play = () => {
      tl = createTimeline({ defaults: { ease: EASE_OUT } })
        .add(words, { translateY: ["110%", "0%"], duration: 900, delay: stagger(60) }, 0)
        .add(support, { opacity: [0, 1], translateY: [14, 0], duration: 800, delay: stagger(90) }, 320)
        .add(deco, { opacity: [0, 1], duration: 700 }, 520);
      h1.removeAttribute("data-pending"); // the inline transforms now own the words
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
      {/* a faint signal grid behind the copy; the background itself is the film's own colour */}
      <div aria-hidden="true" className="dots pointer-events-none absolute inset-y-0 left-0 w-[70%] opacity-70" />

      <div className="container-x relative flex items-center pb-10 pt-12 md:min-h-[min(780px,calc(100svh-72px-96px))] md:py-16">
        <div className="relative z-10 max-w-[600px] md:max-w-[min(640px,39vw)]">
          <h1
            data-pending
            className="h-words max-w-[12em] font-display text-[clamp(2.4rem,3.9vw,3.9rem)] font-semibold leading-[1.06] tracking-[-0.035em] text-white"
          >
            <Words text={HEADLINE} />
          </h1>
          <p data-reveal className="mt-7 max-w-[32rem] text-[1.0625rem] leading-[1.65] text-[#b9c3d1]">
            Our land, your colocation. We hold the land, licences and zoning in the countries your constellation needs,
            and run the power, fibre, security and on-site teams. You bring the antennas.
          </p>
          <div ref={actions} data-reveal className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <a href="#quote" className="btn btn-primary magnet">
              Check site availability
            </a>
            <button
              type="button"
              onClick={() => openFilm()}
              className="group magnet inline-flex items-center gap-3 rounded-md text-[0.95rem] font-semibold text-white"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full border border-white/35 transition-colors group-hover:border-white group-hover:bg-white group-hover:text-[#05090f]">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="ml-0.5">
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
              </span>
              Watch the film (2 min 39)
            </button>
          </div>
          <p data-reveal-fade className="mt-9 text-[13px] text-[#8d9bb0]">
            99.5% power SLA <span className="mx-2 text-white/25">·</span> ISO/IEC 27001 certified{" "}
            <span className="mx-2 text-white/25">·</span>
            <a href="#network" className="whitespace-nowrap text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white">
              {SITES.length} sites, {IN_DEVELOPMENT} in development
            </a>
          </p>
        </div>
      </div>

      {/* the LiveTelco film, flush with the right edge (below the copy on phones).
          Clicking it opens the full film, same as the "Watch the film" button. */}
      {/* data-film-origin: the film player grows out of this box and shrinks back into it (FilmModal) */}
      <div
        ref={film}
        data-film-origin
        data-reveal-fade
        className="relative mx-[clamp(20px,5vw,96px)] mb-8 aspect-video md:absolute md:right-0 md:top-[calc(50%-40px)] md:mx-0 md:mb-0 md:w-[53vw] md:max-w-[1040px] md:translate-y-[calc(-50%_+_var(--drift,0px))]"
      >
        <button
          type="button"
          onClick={() => openFilm()}
          aria-label="Watch the film (2 min 39)"
          className="block h-full w-full cursor-pointer overflow-hidden rounded-2xl md:rounded-none md:rounded-l-2xl"
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

      {/* the operations strip: every live site and its local time */}
      <div data-reveal-fade className="relative">
        <SiteTicker />
      </div>
    </section>
  );
}
