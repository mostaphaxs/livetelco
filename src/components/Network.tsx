"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { animate, createTimeline, stagger } from "animejs";
import { loadLandDots } from "@/lib/landDots";
import { KIND_META, SITES, type SiteKind } from "@/lib/locations";
import { useInView } from "@/lib/motion";

const BOX = { lonMin: -22, lonMax: 75, latMin: -14, latMax: 64 };
const ASPECT = ((BOX.lonMax - BOX.lonMin) * Math.cos((25 * Math.PI) / 180)) / (BOX.latMax - BOX.latMin);
const px = (lon: number) => ((lon - BOX.lonMin) / (BOX.lonMax - BOX.lonMin)) * 100;
const py = (lat: number) => ((BOX.latMax - lat) / (BOX.latMax - BOX.latMin)) * 100;

type Filter = "all" | SiteKind;

function DotMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current!;
    let dots: Float32Array | null = null;
    const draw = () => {
      if (!dots) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = c.clientWidth;
      const h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      const ctx = c.getContext("2d")!;
      ctx.scale(dpr, dpr);
      const r = Math.max(1, w / 520);
      for (let i = 0; i < dots.length; i += 2) {
        const lat = dots[i];
        const lon = dots[i + 1];
        if (lon < BOX.lonMin || lon > BOX.lonMax || lat < BOX.latMin || lat > BOX.latMax) continue;
        const x = (px(lon) / 100) * w;
        const y = (py(lat) / 100) * h;
        // brighten towards the core region (Gulf / Egypt)
        const d = Math.hypot(lon - 40, lat - 24);
        ctx.fillStyle = `rgba(125, 211, 252, ${0.12 + Math.max(0, 1 - d / 55) * 0.35})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    loadLandDots().then((d) => {
      dots = d;
      draw();
    });
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}

export default function Network() {
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const first = useRef(true);

  const ref = useInView<HTMLDivElement>((el) => {
    const tl = createTimeline({ defaults: { ease: "outExpo" } })
      .add(el.querySelectorAll("[data-head]"), { opacity: [0, 1], translateY: [30, 0], delay: stagger(100), duration: 1000 })
      .add(el.querySelector("[data-map]")!, { opacity: [0, 1], scale: [0.96, 1], duration: 1400 }, 150)
      .add(el.querySelectorAll("[data-pin]"), { opacity: [0, 1], scale: [0, 1], delay: stagger(45, { from: "center" }), duration: 900, ease: "outBack(2.5)" }, 600)
      .add(el.querySelectorAll("[data-li]"), { opacity: [0, 1], translateX: [20, 0], delay: stagger(25), duration: 700 }, 700);
    return () => tl.revert();
  }, { threshold: 0.15 });

  // re-animate the list whenever the filter changes
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const items = listRef.current?.querySelectorAll("[data-li]");
    const pins = mapRef.current?.querySelectorAll("[data-pin]:not([data-dim='true'])");
    const a = items && animate(items, { opacity: [0, 1], translateX: [16, 0], delay: stagger(30), duration: 600, ease: "outExpo" });
    const b = pins && animate(pins, { scale: [0.4, 1], delay: stagger(30), duration: 700, ease: "outBack(3)" });
    return () => {
      a?.revert();
      b?.revert();
    };
  }, [filter]);

  const shown = useMemo(() => SITES.filter((s) => filter === "all" || s.kind === filter), [filter]);
  const tabs: Filter[] = ["all", "teleport", "tower", "future"];

  return (
    <section id="network" className="relative overflow-hidden bg-bg-2 py-28 sm:py-36">
      <div ref={ref} className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p data-reveal data-head className="eyebrow">
              The network
            </p>
            <h2 data-reveal data-head className="h-display mt-5 text-[clamp(2.2rem,5vw,4rem)]">
              14 locations. <span className="text-gradient">13 more coming.</span>
            </h2>
          </div>
          <div data-reveal data-head role="tablist" aria-label="Filter sites" className="glass flex flex-wrap gap-1 rounded-full p-1">
            {tabs.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={filter === t}
                onClick={() => setFilter(t)}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  filter === t ? "bg-white text-[#04070f]" : "text-muted hover:text-ink"
                }`}
              >
                {t === "all" ? "All" : KIND_META[t].label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_300px]">
          <div
            data-reveal
            data-map
            ref={mapRef}
            className="relative w-full overflow-hidden rounded-3xl border border-line bg-[#050b18]"
            style={{ aspectRatio: ASPECT }}
          >
            <DotMap />
            {SITES.map((s) => {
              const dim = filter !== "all" && s.kind !== filter;
              const on = active === s.city;
              const color = KIND_META[s.kind].color;
              return (
                <button
                  key={s.city}
                  data-pin
                  data-dim={dim}
                  onMouseEnter={() => setActive(s.city)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(s.city)}
                  onBlur={() => setActive(null)}
                  aria-label={`${s.city}, ${s.country} — ${KIND_META[s.kind].label}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 p-2 transition-opacity duration-500"
                  style={{ left: `${px(s.lon)}%`, top: `${py(s.lat)}%`, opacity: dim ? 0.12 : 1, zIndex: on ? 20 : 1 }}
                >
                  <span className="relative block h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 14px ${color}` }}>
                    {s.kind !== "future" && (
                      <span className="absolute inset-0 animate-ping rounded-full opacity-60" style={{ background: color }} />
                    )}
                  </span>
                  <span
                    className={`pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-[#04070f]/90 px-2 py-1 text-left font-mono text-[0.65rem] backdrop-blur transition-all duration-300 ${
                      on ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
                    }`}
                  >
                    <span className="block text-ink">{s.city}</span>
                    <span className="block text-muted">{s.country}</span>
                  </span>
                </button>
              );
            })}
            <div className="pointer-events-none absolute bottom-4 left-4 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted/70">
              Middle East · Africa · Europe
            </div>
          </div>

          <ul ref={listRef} className="glass max-h-[520px] space-y-0.5 overflow-y-auto rounded-3xl p-3 lg:max-h-none" aria-label="Sites">
            {shown.map((s) => (
              <li key={s.city} data-reveal data-li>
                <button
                  onMouseEnter={() => setActive(s.city)}
                  onMouseLeave={() => setActive(null)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    active === s.city ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: KIND_META[s.kind].color }} />
                  <span className="text-ink">{s.city}</span>
                  <span className="ml-auto text-xs text-muted">{s.country}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-6 text-sm text-muted">Every plot is owned by LiveTelco or held on a long-term lease.</p>
      </div>
    </section>
  );
}
