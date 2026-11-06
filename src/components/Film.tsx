"use client";

import { useEffect, useRef, useState } from "react";
import { animate, createTimeline, onScroll, stagger } from "animejs";
import { prefersReducedMotion, useInView } from "@/lib/motion";

const SRC = "/media/livetelco-film-720.mp4";
const CHAPTERS = [
  { t: 0, label: "The challenge" },
  { t: 31, label: "Our network" },
  { t: 44, label: "How it works" },
  { t: 95, label: "Colocation" },
  { t: 110, label: "Security" },
  { t: 125, label: "Service level" },
];

export default function Film() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // load the video only when it is about to be seen; pause it when it is not
  useEffect(() => {
    const v = videoRef.current!;
    const io = new IntersectionObserver(
      ([e]) => {
        const motionOk = !prefersReducedMotion();
        if (e.isIntersecting) {
          // autoplay lets the browser start as soon as data is ready (muted preview)
          v.autoplay = motionOk;
          if (!v.getAttribute("src")) {
            v.src = SRC;
            setLoaded(true);
          }
          if (motionOk) v.play().catch(() => {});
        } else {
          v.autoplay = false;
          v.pause();
        }
      },
      { rootMargin: "150px 0px", threshold: 0.25 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  // frame grows from inset card to full width as it scrolls into place
  useEffect(() => {
    const el = frameRef.current;
    if (!el || prefersReducedMotion()) return;
    const a = animate(el, {
      scale: [0.86, 1],
      borderRadius: ["48px", "24px"],
      ease: "linear",
      autoplay: onScroll({ target: el, enter: "bottom top", leave: "center center", sync: 0.6 }),
    });
    return () => {
      a.revert();
    };
  }, []);

  const headRef = useInView<HTMLDivElement>((el) => {
    const tl = createTimeline({ defaults: { ease: "outExpo", duration: 1000 } }).add(el.querySelectorAll("[data-head]"), {
      opacity: [0, 1],
      translateY: [30, 0],
      delay: stagger(100),
    });
    return () => tl.revert();
  });

  const toggleSound = () => {
    const v = videoRef.current!;
    if (muted) {
      v.currentTime = playing && v.currentTime > 2 ? v.currentTime : 0;
      v.muted = false;
      v.play().catch(() => {});
    } else {
      v.muted = true;
    }
    setMuted(!muted);
  };
  const togglePlay = () => {
    const v = videoRef.current!;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };
  const seek = (t: number) => {
    const v = videoRef.current!;
    v.currentTime = t;
    v.play().catch(() => {});
  };

  return (
    <section id="film" className="relative py-24 sm:py-32">
      <div className="container-x">
        <div ref={headRef} className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p data-reveal data-head className="eyebrow">
              The film
            </p>
            <h2 data-reveal data-head className="h-display mt-5 text-[clamp(2rem,4.4vw,3.6rem)]">
              From empty land to <span className="text-gradient">live teleport.</span>
            </h2>
          </div>
          <p data-reveal data-head className="max-w-sm text-sm leading-relaxed text-muted">
            2½ minutes on why ground stations take so long — and how LiveTelco makes them ready before you are.
          </p>
        </div>

        <div
          ref={frameRef}
          className="relative mt-12 aspect-video w-full overflow-hidden rounded-3xl border border-line bg-black shadow-[0_60px_140px_-50px_rgba(56,189,248,.45)]"
        >
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            poster="/media/film-poster.jpg"
            muted={muted}
            loop
            playsInline
            preload="none"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration) setProgress(v.currentTime / v.duration);
            }}
            aria-label="LiveTelco film"
          />

          {/* big call to action until sound is on */}
          {muted && (
            <button
              type="button"
              onClick={toggleSound}
              className="group absolute inset-0 grid place-items-center bg-gradient-to-t from-black/50 via-transparent to-transparent"
              aria-label="Play the film with sound"
            >
              <span className="relative grid h-20 w-20 place-items-center rounded-full bg-white/90 text-[#04070f] shadow-[0_0_60px_rgba(56,189,248,.6)] transition-transform duration-500 group-hover:scale-110 sm:h-24 sm:w-24">
                <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
              </span>
              <span className="absolute bottom-16 font-mono text-xs uppercase tracking-[0.25em] text-white/80 sm:bottom-20">
                Watch with sound · 2:39
              </span>
            </button>
          )}

          {/* controls */}
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-3 sm:p-4">
            <button type="button" onClick={togglePlay} className="glass grid h-9 w-9 place-items-center rounded-full" aria-label={playing ? "Pause" : "Play"}>
              {playing ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
              )}
            </button>
            <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/15">
              <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan to-indigo" style={{ width: `${progress * 100}%` }} />
            </div>
            <button type="button" onClick={toggleSound} className="glass rounded-full px-3 py-2 font-mono text-[0.7rem]" aria-pressed={!muted}>
              {muted ? "Sound off" : "Sound on"}
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {CHAPTERS.map((c) => (
            <button
              key={c.t}
              type="button"
              disabled={!loaded}
              onClick={() => seek(c.t)}
              className="rounded-full border border-line px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-cyan/50 hover:text-ink disabled:opacity-50"
            >
              {String(Math.floor(c.t / 60))}:{String(c.t % 60).padStart(2, "0")} · {c.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
