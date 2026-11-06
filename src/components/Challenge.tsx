"use client";

import { animate, createTimeline, stagger } from "animejs";
import { useInView } from "@/lib/motion";

const DIY = [
  { label: "Find & buy land", w: 22 },
  { label: "Zoning & RF studies", w: 18 },
  { label: "Local permits & licence", w: 30 },
  { label: "Power, fibre, build", w: 24 },
];
const LT = [
  { label: "Pick a site", w: 4 },
  { label: "Sign colocation", w: 5 },
  { label: "Install antennas", w: 9 },
];

export default function Challenge() {
  const ref = useInView<HTMLDivElement>((el) => {
    const tl = createTimeline({ defaults: { ease: "outExpo" } })
      .add(el.querySelectorAll("[data-head]"), { opacity: [0, 1], translateY: [30, 0], delay: stagger(100), duration: 1000 })
      .add(el.querySelectorAll("[data-panel]"), { opacity: [0, 1], translateY: [40, 0], delay: stagger(150), duration: 1000 }, 200)
      .add(el.querySelectorAll("[data-bar-diy]"), { scaleX: [0, 1], delay: stagger(260), duration: 1100, ease: "inOutQuart" }, 600)
      .add(el.querySelectorAll("[data-bar-lt]"), { scaleX: [0, 1], delay: stagger(120), duration: 700, ease: "outQuart" }, 700)
      .add(el.querySelectorAll("[data-total]"), { opacity: [0, 1], scale: [0.6, 1], delay: stagger(200), duration: 900, ease: "outElastic(1, .6)" }, 1700);
    const o = { v: 0 };
    const n = el.querySelector<HTMLElement>("[data-months]")!;
    const c = animate(o, {
      v: 24,
      duration: 2200,
      delay: 600,
      ease: "inOutQuart",
      onUpdate: () => (n.textContent = String(Math.round(o.v))),
    });
    return () => {
      tl.revert();
      c.pause();
    };
  });

  return (
    <section className="relative py-28 sm:py-36">
      <div ref={ref} className="container-x">
        <div className="max-w-3xl">
          <p data-reveal data-head className="eyebrow">
            The challenge
          </p>
          <h2 data-reveal data-head className="h-display mt-5 text-[clamp(2rem,4.4vw,3.6rem)]">
            Months of delays. Rising costs. <span className="text-muted">Or a site that is ready now.</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <div data-reveal data-panel className="glass rounded-3xl p-6 sm:p-8">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-lg">Building your own gateway</h3>
              <div className="font-mono text-sm text-muted">
                ~<span data-months className="text-rose-400">0</span> months
              </div>
            </div>
            <div className="mt-8 space-y-4">
              {DIY.map((b) => (
                <div key={b.label}>
                  <div className="mb-1.5 text-xs text-muted">{b.label}</div>
                  <div className="h-2.5 rounded-full bg-white/5">
                    <div
                      data-bar-diy
                      className="h-full origin-left rounded-full bg-gradient-to-r from-rose-500/80 to-orange-400/80"
                      style={{ width: `${b.w * 3.2}%`, transform: "scaleX(0)" }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p data-reveal data-total className="mt-8 text-sm text-muted">
              Every country is a new legal, technical and political project — before the first link.
            </p>
          </div>

          <div data-reveal data-panel className="spot relative overflow-hidden rounded-3xl border border-cyan/25 bg-gradient-to-b from-cyan/[0.08] to-indigo/[0.06] p-6 sm:p-8">
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan/20 blur-3xl" />
            <div className="relative flex items-baseline justify-between">
              <h3 className="font-display text-lg">With LiveTelco</h3>
              <div className="font-mono text-sm text-cyan">weeks, not years</div>
            </div>
            <div className="relative mt-8 space-y-4">
              {LT.map((b) => (
                <div key={b.label}>
                  <div className="mb-1.5 text-xs text-muted">{b.label}</div>
                  <div className="h-2.5 rounded-full bg-white/5">
                    <div
                      data-bar-lt
                      className="h-full origin-left rounded-full bg-gradient-to-r from-cyan to-indigo"
                      style={{ width: `${b.w * 3.2}%`, transform: "scaleX(0)" }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div data-reveal data-total className="relative mt-8 inline-flex items-center gap-2 rounded-full border border-green/30 bg-green/10 px-3 py-1.5 font-mono text-xs text-green">
              ✓ Land, licence and approvals already in place
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
