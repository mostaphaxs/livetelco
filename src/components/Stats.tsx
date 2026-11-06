"use client";

import { animate, stagger } from "animejs";
import { useInView } from "@/lib/motion";

const STATS = [
  { value: 14, suffix: "", label: "Locations in 7 countries" },
  { value: 13, suffix: "", label: "Future teleports in build" },
  { value: 500, suffix: " kVA+", label: "Power, 99.5% SLA backup" },
  { value: 24, suffix: "/7", label: "NOC watching every site" },
  { value: 100, suffix: "G+", label: "Fibre, Tier 1 redundancy" },
];

const COUNTRIES = ["Saudi Arabia", "UAE", "Egypt", "Nigeria", "Ghana", "Cyprus", "Lebanon", "Morocco", "Senegal", "Tanzania", "DR Congo", "Norway", "Croatia", "Pakistan"];

export default function Stats() {
  const ref = useInView<HTMLDivElement>((el) => {
    const cells = el.querySelectorAll<HTMLElement>("[data-cell]");
    const a = animate(cells, {
      opacity: [0, 1],
      translateY: [30, 0],
      delay: stagger(80),
      duration: 1000,
      ease: "outExpo",
    });
    const counters = [...el.querySelectorAll<HTMLElement>("[data-count]")].map((n, i) => {
      const target = Number(n.dataset.count);
      const o = { v: 0 };
      return animate(o, {
        v: target,
        duration: 1800,
        delay: 200 + i * 80,
        ease: "outExpo",
        onUpdate: () => (n.textContent = String(Math.round(o.v))),
      });
    });
    return () => {
      a.revert();
      counters.forEach((c) => c.pause());
    };
  });

  return (
    <section aria-label="Key figures" className="relative border-y border-line bg-bg-2/60">
      <div ref={ref} className="container-x grid grid-cols-2 md:grid-cols-5">
        {STATS.map((s, i) => (
          <div
            key={s.label}
            data-reveal
            data-cell
            className={`border-line px-2 py-8 sm:px-6 ${i > 0 ? "md:border-l" : ""} ${i % 2 === 1 ? "border-l md:border-l" : ""} ${i >= 2 ? "border-t md:border-t-0" : ""} ${i === 4 ? "col-span-2 md:col-span-1" : ""}`}
          >
            <div className="h-display text-[clamp(2rem,3.4vw,2.9rem)]">
              <span data-count={s.value}>{s.value}</span>
              <span className="text-cyan">{s.suffix}</span>
            </div>
            <div className="mt-2 text-sm text-muted">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="overflow-hidden border-t border-line py-4" aria-hidden="true">
        <div className="marquee flex w-max gap-10 whitespace-nowrap font-mono text-xs uppercase tracking-[0.25em] text-muted/70">
          {[...COUNTRIES, ...COUNTRIES].map((c, i) => (
            <span key={i} className="flex items-center gap-10">
              {c} <span className="text-amber">✦</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
