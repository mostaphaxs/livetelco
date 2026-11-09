"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { EASE_OUT, prefersReducedMotion } from "@/lib/motion";

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return setOpen(false);
      if (e.key !== "Tab" || !panel.current) return;
      // focus trap: Tab cycles inside the dialog (close button, player, chapters)
      const f = [...panel.current.querySelectorAll<HTMLElement>("button, video[controls], summary")];
      const first = f[0];
      const last = f[f.length - 1];
      if (!panel.current.contains(document.activeElement)) {
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
    const anims =
      prefersReducedMotion() || !panel.current || !backdrop.current
        ? []
        : [
            animate(backdrop.current, { opacity: [0, 1], duration: 250, ease: EASE_OUT }),
            // modal: centred, 300 ms on a strong ease-out (budget 200–500 ms)
            animate(panel.current, { opacity: [0, 1], scale: [0.96, 1], translateY: [12, 0], duration: 300, ease: EASE_OUT }),
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="LiveTelco film">
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
  );
}
