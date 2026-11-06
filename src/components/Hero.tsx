"use client";

import { useEffect, useRef, useState } from "react";
import { animate, createTimeline, splitText, stagger } from "animejs";
import Globe from "./globe/Globe";
import { KIND_META, SITES, type Site } from "@/lib/locations";
import { prefersReducedMotion } from "@/lib/motion";

function UtcClock() {
  const [t, setT] = useState("--:--:--");
  useEffect(() => {
    const tick = () => setT(new Date().toISOString().slice(11, 19));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span suppressHydrationWarning>{t}</span>;
}

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const [globeReady, setGlobeReady] = useState(false);
  const [focus, setFocus] = useState<Site | null>(null);
  const focusRef = useRef<HTMLDivElement>(null);

  // animate the focus card each time the globe tour moves to a new site
  useEffect(() => {
    const el = focusRef.current;
    if (!el || prefersReducedMotion()) return;
    const a = animate(el.children, {
      opacity: [0, 1],
      translateY: [12, 0],
      delay: stagger(70),
      duration: 700,
      ease: "outExpo",
    });
    return () => {
      a.revert();
    };
  }, [focus]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reveal = el.querySelectorAll<HTMLElement>("[data-reveal]");
    if (prefersReducedMotion()) {
      reveal.forEach((n) => (n.style.opacity = "1"));
      return;
    }
    const h1 = el.querySelector("h1")!;
    const split = splitText(h1, { words: { wrap: "clip" } });
    h1.style.opacity = "1";

    const tl = createTimeline({ defaults: { ease: "outExpo", duration: 1200 } })
      .add(el.querySelector("[data-eyebrow]")!, { opacity: [0, 1], translateX: [-24, 0] }, 150)
      .add(split.words, { translateY: ["110%", "0%"], delay: stagger(55) }, 250)
      .add(el.querySelectorAll("[data-fade]"), { opacity: [0, 1], translateY: [18, 0], delay: stagger(90) }, 750)
      .add(el.querySelectorAll("[data-hud]"), { opacity: [0, 1], scale: [0.96, 1], delay: stagger(120) }, 1300);

    return () => {
      tl.revert();
      split.revert();
    };
  }, []);

  const counts = {
    teleport: SITES.filter((s) => s.kind === "teleport").length,
    tower: SITES.filter((s) => s.kind === "tower").length,
    future: 13,
  };

  return (
    <section ref={root} id="top" className="relative isolate overflow-hidden pt-[88px]">
      {/* backdrop */}
      <div className="grid-bg absolute inset-0 -z-10 opacity-60" />
      <div className="absolute -left-40 top-20 -z-10 h-[520px] w-[520px] rounded-full bg-indigo/20 blur-[140px]" />
      <div className="absolute -right-20 bottom-0 -z-10 h-[420px] w-[620px] rounded-full bg-cyan/10 blur-[140px]" />

      <div className="container-x grid min-h-[calc(100svh-88px)] items-center gap-6 pb-10 lg:grid-cols-[1.02fr_1fr]">
        {/* copy */}
        <div className="relative z-10 pt-10 lg:pt-0">
          <p data-reveal data-eyebrow className="eyebrow">
            Our land. Your colocation.
          </p>
          <h1
            data-reveal
            className="h-display mt-6 text-[clamp(2.6rem,6.2vw,5.4rem)]"
          >
            Ground stations for the <span className="text-gradient">LEO&nbsp;era</span>, ready before you are.
          </h1>
          <p data-reveal data-fade className="mt-7 max-w-xl text-[1.05rem] leading-relaxed text-muted">
            Thousands of satellites are going up, and every constellation needs gateways on the ground. LiveTelco
            gives you secure teleports in the right countries — licensed, approved and zoned, with land, power, fibre,
            security and on-site teams included.
          </p>
          <div data-reveal data-fade className="mt-9 flex flex-wrap gap-3">
            <a href="#quote" className="btn btn-primary">
              Get a quote
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </a>
            <a href="#network" className="btn btn-ghost">
              Explore 14 locations
            </a>
          </div>
          <div data-reveal data-fade className="mt-10 flex items-center gap-4 font-mono text-xs text-muted">
            <span className="inline-flex items-center gap-2 rounded-full border border-green/30 bg-green/10 px-3 py-1.5 text-green">
              <span className="blink h-1.5 w-1.5 rounded-full bg-green" /> NOC online
            </span>
            <span>
              UTC <UtcClock />
            </span>
            <span className="hidden sm:inline">ISO/IEC 27001:2022</span>
          </div>
        </div>

        {/* globe */}
        <div className="relative mx-auto aspect-square w-full max-w-[680px] lg:max-w-none">
          <div
            className={`absolute inset-[-12%] transition-opacity duration-1000 lg:inset-[-16%] lg:right-[-24%] ${globeReady ? "opacity-100" : "opacity-0"}`}
          >
            <Globe onReady={() => setGlobeReady(true)} onFocusSite={setFocus} />
          </div>

          {/* site currently in focus (follows the globe tour) */}
          {focus && (
            <div
              key={focus.city}
              ref={focusRef}
              className="glass pointer-events-none absolute right-0 bottom-[22%] hidden w-56 overflow-hidden rounded-2xl p-4 sm:block lg:bottom-[8%]"
            >
              <div className="flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.2em]" style={{ color: KIND_META[focus.kind].color }}>
                <span className="blink h-1.5 w-1.5 rounded-full" style={{ background: KIND_META[focus.kind].color }} />
                {focus.kind === "future" ? "Coming soon" : focus.kind === "tower" ? "Tower · live" : "Teleport · live"}
              </div>
              <div className="mt-2 font-display text-2xl leading-tight">{focus.city}</div>
              <div className="text-sm text-muted">{focus.country}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 font-mono text-[0.62rem] text-muted">
                <div>
                  <div className="text-ink">{focus.lat.toFixed(1)}°</div>lat
                </div>
                <div>
                  <div className="text-ink">{focus.lon.toFixed(1)}°</div>lon
                </div>
                <div>
                  <div className="text-green">99.5%</div>SLA
                </div>
              </div>
            </div>
          )}

          {/* HUD */}
          <div
            data-reveal
            data-hud
            className="glass pointer-events-none absolute bottom-[6%] left-0 rounded-2xl px-4 py-3 font-mono text-[0.7rem] sm:left-[2%]"
          >
            {(Object.keys(KIND_META) as (keyof typeof KIND_META)[]).map((k) => (
              <div key={k} className="flex items-center gap-2.5 py-0.5">
                <span className="h-2 w-2 rounded-full" style={{ background: KIND_META[k].color, boxShadow: `0 0 10px ${KIND_META[k].color}` }} />
                <span className="text-muted">{KIND_META[k].label}</span>
                <span className="ml-auto pl-4 text-ink">{counts[k]}</span>
              </div>
            ))}
          </div>
          <div
            data-reveal
            data-hud
            className="glass pointer-events-none absolute right-0 top-[8%] hidden rounded-2xl px-4 py-3 font-mono text-[0.7rem] sm:block"
          >
            <div className="text-muted">LEO TRACKING</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl text-ink">24</span>
              <span className="text-cyan">sats in view</span>
            </div>
            <div className="mt-1 text-muted">drag to rotate ↻</div>
          </div>
        </div>
      </div>
    </section>
  );
}
