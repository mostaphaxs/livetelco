"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { prefersReducedMotion } from "@/lib/motion";

const SRC = "/media/livetelco-film-720.mp4";
const CHAPTERS = [
  { t: 0, label: "The challenge" },
  { t: 31, label: "Our network" },
  { t: 44, label: "How it works" },
  { t: 95, label: "Colocation" },
  { t: 110, label: "Security" },
  { t: 125, label: "Service level" },
];

/** Open the LiveTelco film in the modal player, optionally at a given second. */
export const openFilm = (t = 0) => window.dispatchEvent(new CustomEvent("film:open", { detail: t }));

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

export default function FilmModal() {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(0);
  const startAt = useRef(0);
  const panel = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      startAt.current = (e as CustomEvent<number>).detail || 0;
      lastFocus.current = document.activeElement as HTMLElement;
      setOpen(true);
    };
    window.addEventListener("film:open", onOpen);
    return () => window.removeEventListener("film:open", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const v = video.current!;
    v.currentTime = startAt.current;
    v.play().catch(() => {});
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const anims =
      prefersReducedMotion() || !panel.current || !backdrop.current
        ? []
        : [
            animate(backdrop.current, { opacity: [0, 1], duration: 300, ease: "outQuad" }),
            animate(panel.current, { opacity: [0, 1], scale: [0.96, 1], translateY: [16, 0], duration: 500, ease: "outCubic" }),
          ];
    panel.current?.querySelector<HTMLElement>("[data-close]")?.focus();
    return () => {
      anims.forEach((a) => a.revert());
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      v.pause();
      lastFocus.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="LiveTelco film">
      <div ref={backdrop} className="absolute inset-0 bg-[#050b14]/85 backdrop-blur-md" onClick={() => setOpen(false)} />
      <div ref={panel} className="relative w-full max-w-5xl">
        <div className="mb-3 flex items-center justify-between text-white">
          <div className="font-display text-lg font-semibold">How LiveTelco works</div>
          <button
            data-close
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            aria-label="Close the film"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="overflow-hidden rounded-xl bg-black shadow-[0_40px_120px_-20px_rgba(0,0,0,.8)]">
          <video
            ref={video}
            src={SRC}
            poster="/media/film-poster.jpg"
            controls
            playsInline
            className="aspect-video w-full"
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
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
      </div>
    </div>
  );
}
