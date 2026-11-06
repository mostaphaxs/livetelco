"use client";

import { createDrawable, createTimeline, stagger } from "animejs";
import type { PointerEvent, ReactNode } from "react";
import { useInView } from "@/lib/motion";

const I = (d: string) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path data-icon d={d} />
  </svg>
);

const SERVICES: { title: string; body: string; icon: ReactNode; span: string; tags?: string[] }[] = [
  {
    title: "Colocation",
    body: "A fenced antenna area in a shared compound, or a whole teleport reserved for you. Power, fibre, shelters and people around your antennas.",
    icon: I("M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6M12 3v2"),
    span: "md:col-span-2 md:row-span-2",
    tags: ["Shared teleports", "Dedicated teleports", "Data rooms", "Warehouses"],
  },
  {
    title: "Security",
    body: "Premium with 24/7 guards, or Standard with automated access control, CCTV and NOC monitoring.",
    icon: I("M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4"),
    span: "",
  },
  {
    title: "Technical services",
    body: "Our teams install and maintain antennas on request — trained by and acting under the guidance of each operator.",
    icon: I("M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5z"),
    span: "",
  },
  {
    title: "Site acquisition",
    body: "Need a new country? We find and acquire the land, then handle permits and greenfield construction with our local teams.",
    icon: I("M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"),
    span: "",
  },
  {
    title: "Connectivity",
    body: "100G+ fibre with redundancy across Tier 1 operators, and 500 kVA+ of power on a 99.5% SLA.",
    icon: I("M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0M12 19.5h.01"),
    span: "",
  },
];

function trackSpot(e: PointerEvent<HTMLElement>) {
  const t = (e.target as HTMLElement).closest<HTMLElement>(".spot");
  if (!t) return;
  const r = t.getBoundingClientRect();
  t.style.setProperty("--mx", `${e.clientX - r.left}px`);
  t.style.setProperty("--my", `${e.clientY - r.top}px`);
}

export default function Services() {
  const ref = useInView<HTMLDivElement>((el) => {
    const tl = createTimeline({ defaults: { ease: "outExpo" } })
      .add(el.querySelectorAll("[data-head]"), { opacity: [0, 1], translateY: [30, 0], delay: stagger(100), duration: 1000 })
      .add(
        el.querySelectorAll("[data-card]"),
        { opacity: [0, 1], translateY: [50, 0], scale: [0.97, 1], delay: stagger(90, { grid: [3, 2], from: "first" }), duration: 1100 },
        200
      )
      .add(createDrawable(el.querySelectorAll("[data-icon]")), { draw: ["0 0", "0 1"], delay: stagger(90), duration: 1400, ease: "inOutSine" }, 400)
      .add(el.querySelectorAll("[data-tag]"), { opacity: [0, 1], translateY: [8, 0], delay: stagger(50), duration: 600 }, 900);
    return () => tl.revert();
  }, { threshold: 0.12 });

  return (
    <section id="services" className="relative py-28 sm:py-36">
      <div ref={ref} className="container-x" onPointerMove={trackSpot}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p data-reveal data-head className="eyebrow">
              A facility provider, not an antenna operator
            </p>
            <h2 data-reveal data-head className="h-display mt-5 text-[clamp(2rem,4.4vw,3.6rem)]">
              Everything around the antenna. <span className="text-muted">You keep full control of yours.</span>
            </h2>
          </div>
          <p data-reveal data-head className="max-w-sm text-sm leading-relaxed text-muted">
            We serve LEO constellations first, and also GEO and MEO operators, broadcasters and anyone who needs an
            in-country ground station.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-4 md:grid-rows-2">
          {SERVICES.map((s) => (
            <article
              key={s.title}
              data-reveal
              data-card
              className={`spot glass group flex flex-col rounded-3xl p-7 transition-transform duration-500 hover:-translate-y-1 ${s.span}`}
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl border border-line bg-white/[0.03] text-cyan transition-colors group-hover:border-cyan/40">
                {s.icon}
              </div>
              <h3 className={`mt-6 font-display ${s.tags ? "text-3xl" : "text-xl"}`}>{s.title}</h3>
              <p className={`mt-3 leading-relaxed text-muted ${s.tags ? "max-w-md" : "text-sm"}`}>{s.body}</p>
              {s.tags && (
                <>
                  <div className="mt-auto flex flex-wrap gap-2 pt-10">
                    {s.tags.map((t) => (
                      <span key={t} data-reveal data-tag className="rounded-full border border-line bg-white/[0.03] px-3 py-1.5 text-xs text-ink/80">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-line p-4">
                      <div className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-cyan">Shared</div>
                      <p className="mt-2 text-muted">Several operators, one compound. Costs down, timelines short.</p>
                    </div>
                    <div className="rounded-2xl border border-line p-4">
                      <div className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-indigo">Dedicated</div>
                      <p className="mt-2 text-muted">A whole teleport for you, on a 3+ year agreement.</p>
                    </div>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
