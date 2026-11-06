"use client";

import { useEffect, useRef, useState } from "react";
import { createDrawable, createTimeline, stagger } from "animejs";
import { useInView } from "@/lib/motion";

const FEATURES = [
  ["Power & costs", "allocation and consumption"],
  ["Visits", "requests and gate log"],
  ["Security", "CCTV and incident reports"],
  ["Maintenance", "generator and electrical register"],
  ["Tickets", "24/7 NOC follow-up"],
  ["Documents", "contracts, invoices, reports"],
];

const SITES = [
  { code: "XX1", country: "UAE", tier: "Dedicated · Premium", base: 24, status: "All systems normal", ok: true },
  { code: "XX2", country: "Saudi Arabia", tier: "Shared · Standard", base: 12, status: "All systems normal", ok: true },
  { code: "XX3", country: "Egypt", tier: "Shared · Standard", base: 10, status: "Maintenance 20 Oct", ok: false },
];

function spark(seed: number) {
  let y = 20;
  const pts: string[] = [];
  for (let i = 0; i <= 24; i++) {
    y = Math.max(4, Math.min(28, y + Math.sin(i * 1.7 + seed) * 4 + Math.cos(i * 0.6 + seed * 2) * 2));
    pts.push(`${(i / 24) * 120},${y.toFixed(1)}`);
  }
  return "M" + pts.join(" L");
}

export default function Portal() {
  const [load, setLoad] = useState(SITES.map((s) => s.base));
  const live = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (!live.current || document.hidden) return;
      setLoad(SITES.map((s) => +(s.base + (Math.random() - 0.5) * 1.6).toFixed(1)));
    }, 1600);
    return () => clearInterval(id);
  }, []);

  const ref = useInView<HTMLDivElement>((el) => {
    live.current = true;
    const tl = createTimeline({ defaults: { ease: "outExpo" } })
      .add(el.querySelectorAll("[data-head]"), { opacity: [0, 1], translateY: [30, 0], delay: stagger(90), duration: 1000 })
      .add(el.querySelector("[data-window]")!, { opacity: [0, 1], translateY: [80, 0], rotateX: [18, 0], duration: 1600 }, 200)
      .add(el.querySelectorAll("[data-kpi], [data-site]"), { opacity: [0, 1], translateY: [16, 0], delay: stagger(80), duration: 800 }, 800)
      .add(createDrawable(el.querySelectorAll("[data-spark]")), { draw: ["0 0", "0 1"], delay: stagger(150), duration: 1500, ease: "inOutQuad" }, 1100);
    return () => tl.revert();
  }, { threshold: 0.15 });

  return (
    <section id="portal" className="relative py-28 sm:py-36">
      <div className="absolute inset-x-0 top-1/3 -z-10 mx-auto h-[500px] max-w-5xl rounded-full bg-indigo/15 blur-[160px]" />
      <div ref={ref} className="container-x">
        <div className="mx-auto max-w-3xl text-center">
          <p data-reveal data-head className="eyebrow">
            Client portal
          </p>
          <h2 data-reveal data-head className="h-display mt-5 text-[clamp(2.2rem,5vw,4rem)]">
            Every teleport, <span className="text-gradient">followed live.</span>
          </h2>
          <p data-reveal data-head className="mx-auto mt-6 max-w-xl leading-relaxed text-muted">
            Each operator sees its own sites, with two-step sign-in and access managed by the operator&apos;s own admin.
          </p>
        </div>

        <div data-reveal data-head className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          {FEATURES.map(([a, b]) => (
            <div key={a}>
              <span className="text-ink">{a}</span> <span className="text-muted">· {b}</span>
            </div>
          ))}
        </div>

        <div className="mt-16 [perspective:1600px]">
          <div data-reveal data-window className="overflow-hidden rounded-3xl border border-line bg-[#0a1122]/90 shadow-[0_60px_120px_-40px_rgba(56,189,248,.35)]">
            {/* title bar */}
            <div className="flex items-center gap-2 border-b border-line px-5 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-green/70" />
              <span className="ml-4 truncate font-mono text-xs text-muted">portal.livetelco.com / overview</span>
              <span className="ml-auto hidden items-center gap-2 font-mono text-xs text-green sm:flex">
                <span className="blink h-1.5 w-1.5 rounded-full bg-green" /> live
              </span>
            </div>

            <div className="grid md:grid-cols-[200px_1fr]">
              <aside className="hidden border-r border-line p-4 text-sm md:block">
                <div className="rounded-xl bg-white/[0.04] p-3">
                  <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted">Customer</div>
                  <div className="mt-1 text-ink">Demo Operator</div>
                </div>
                <ul className="mt-4 space-y-1 text-muted">
                  {["Overview", "Site status & SLA", "Access & visits", "Security & CCTV", "Tickets", "Documents", "Users"].map((x, i) => (
                    <li key={x} className={`rounded-lg px-3 py-2 ${i === 0 ? "bg-cyan/10 text-cyan" : ""}`}>
                      {x}
                    </li>
                  ))}
                </ul>
              </aside>

              <div className="p-5 sm:p-7">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    ["Power availability", "100.000%", "last 30 days"],
                    ["Open tickets", "1", "response < 15 min"],
                    ["Visit requests", "1 pending", "gate log synced"],
                    ["Teleports", "3", "in 3 countries"],
                  ].map(([k, v, s]) => (
                    <div key={k} data-reveal data-kpi className="rounded-2xl border border-line bg-white/[0.02] p-4">
                      <div className="text-xs text-muted">{k}</div>
                      <div className="mt-2 font-display text-xl sm:text-2xl">{v}</div>
                      <div className="mt-1 text-[0.7rem] text-muted/80">{s}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  {SITES.map((s, i) => (
                    <div key={s.code} data-reveal data-site className="rounded-2xl border border-line bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-display">Site {s.code}</div>
                        <span className={`rounded-full px-2 py-0.5 text-[0.65rem] ${s.ok ? "bg-green/10 text-green" : "bg-amber/10 text-amber"}`}>
                          {s.status}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        {s.country} · {s.tier}
                      </div>
                      <div className="mt-4 flex items-end justify-between">
                        <div>
                          <div className="text-[0.7rem] text-muted">Live load</div>
                          <div className="font-mono text-lg tabular-nums text-ink">
                            {load[i].toFixed(1)} <span className="text-xs text-muted">kW</span>
                          </div>
                        </div>
                        <svg width="120" height="32" viewBox="0 0 120 32" className="overflow-visible" aria-hidden="true">
                          <path data-spark d={spark(i * 2.3 + 1)} fill="none" stroke={s.ok ? "#38bdf8" : "#f5a524"} strokeWidth="1.6" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="mt-4 space-y-1.5 text-xs">
                        {["Grid feed A", "Grid feed B", "UPS load", "Generator"].map((r, j) => (
                          <div key={r} className="flex justify-between border-t border-line/60 pt-1.5">
                            <span className="text-muted">{r}</span>
                            <span className="text-ink/90">{j < 2 ? "Online · 400 V" : j === 2 ? `${32 + i * 3}%` : "Standby · fuel 92%"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted">Sample account shown.</p>
        </div>

        <div className="mt-12 text-center">
          <a href="#quote" className="btn btn-ghost">
            Sign in to the portal
          </a>
        </div>
      </div>
    </section>
  );
}
