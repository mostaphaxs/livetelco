"use client";

import { createDrawable, createTimeline, stagger } from "animejs";
import { useInView } from "@/lib/motion";

const ROWS = [
  { tag: "Land", title: "Owned or on long-term lease", note: "Title checked, held by a LiveTelco local entity", stamp: "Secured" },
  { tag: "Zoning", title: "Zoned for RF and satellite use", note: "Industrial land, clear horizon, no interference", stamp: "Approved" },
  { tag: "Authorities", title: "Local approvals in place", note: "Permits, aviation, environment, civil defence", stamp: "Approved" },
  { tag: "Licence", title: "Site licence in place", note: "Ready for operators to install", stamp: "Licensed" },
];

export default function Compliance() {
  const ref = useInView<HTMLDivElement>((el) => {
    const tl = createTimeline({ defaults: { ease: "outExpo" } })
      .add(el.querySelectorAll("[data-head]"), { opacity: [0, 1], translateY: [30, 0], delay: stagger(100), duration: 1000 })
      .add(el.querySelectorAll("[data-row]"), { opacity: [0, 1], translateX: [-40, 0], delay: stagger(140), duration: 900 }, 250)
      .add(el.querySelectorAll("[data-rail]"), { scaleY: [0, 1], delay: stagger(140), duration: 700, ease: "outQuart" }, 350)
      .add(
        el.querySelectorAll("[data-stamp]"),
        {
          opacity: [0, 1],
          scale: [2.4, 1],
          rotate: [-28, -8],
          delay: stagger(260),
          duration: 650,
          ease: "outBack(2)",
        },
        900
      )
      .add(createDrawable(el.querySelectorAll("[data-check]")), { draw: ["0 0", "0 1"], duration: 900, ease: "inOutQuad" }, 1900)
      .add(el.querySelectorAll("[data-done]"), { opacity: [0, 1], translateY: [10, 0], duration: 800 }, 2300);
    return () => tl.revert();
  }, { threshold: 0.25 });

  return (
    <section id="compliance" className="relative overflow-hidden bg-bg-2 py-28 sm:py-36">
      <div className="absolute left-1/2 top-0 h-px w-[80%] -translate-x-1/2 bg-gradient-to-r from-transparent via-amber/40 to-transparent" />
      <div ref={ref} className="container-x grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p data-reveal data-head className="eyebrow">
            Every LiveTelco teleport
          </p>
          <h2 data-reveal data-head className="h-display mt-5 text-[clamp(2rem,4.4vw,3.6rem)]">
            Licensed. Approved. <span className="text-gradient">Zoned for satellite.</span>
          </h2>
          <p data-reveal data-head className="mt-6 max-w-md leading-relaxed text-muted">
            Each site comes with its licence, local-authority approvals and the zoning that allows RF and satellite
            operations. Operators install on land that is ready — not on a promise.
          </p>
          <div data-reveal data-done className="mt-10 flex items-center gap-4">
            <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
              <circle cx="28" cy="28" r="26" fill="none" stroke="rgba(52,211,153,.25)" strokeWidth="2" />
              <path data-check d="M17 29l7 7 15-16" fill="none" stroke="#34d399" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="h-display text-2xl">No bad surprises.</span>
          </div>
        </div>

        <ol className="space-y-4">
          {ROWS.map((r, i) => (
            <li
              key={r.tag}
              data-reveal
              data-row
              className="glass relative flex items-center gap-5 overflow-hidden rounded-2xl p-5 sm:p-7"
            >
              <span data-rail className="absolute inset-y-0 left-0 w-[3px] origin-top bg-gradient-to-b from-amber to-orange-600" style={{ transform: "scaleY(0)" }} />
              <span className="hidden font-mono text-3xl text-white/10 sm:block">0{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-amber">{r.tag}</div>
                <div className="mt-1.5 font-display text-lg sm:text-xl">{r.title}</div>
                <div className="mt-1 text-sm text-muted">{r.note}</div>
              </div>
              <span
                data-reveal
                data-stamp
                className="shrink-0 rounded-md border-2 border-green/70 px-2.5 py-1 font-mono text-[0.65rem] font-bold uppercase tracking-[0.2em] text-green shadow-[0_0_24px_-6px_rgba(52,211,153,.6)] sm:text-xs"
                style={{ transform: "rotate(-8deg)" }}
              >
                {r.stamp}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
