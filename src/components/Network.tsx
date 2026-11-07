"use client";

import { animate, stagger } from "animejs";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "./globe/Globe";
import { prefersReducedMotion } from "@/lib/motion";
import { KIND_META, SITES, type Site, type SiteKind } from "@/lib/locations";

type Filter = "all" | SiteKind;

const siteCount = (country: string) =>
  SITES.filter((s) => s.country === country && s.kind !== "future").length;

export default function Network() {
  const [filter, setFilter] = useState<Filter>("all");
  const [hover, setHover] = useState<string | null>(null);
  const [focus, setFocus] = useState<Site | null>(null);
  const [ready, setReady] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // re-animate the list whenever the filter changes
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const items = listRef.current?.querySelectorAll("[data-li]");
    const a =
      items &&
      animate(items, {
        opacity: [0, 1],
        delay: stagger(15),
        duration: 400,
        ease: "outCubic",
      });
    return () => {
      a?.revert();
    };
  }, [filter]);

  // soft cross-fade of the site card each time the globe moves to another site
  useEffect(() => {
    const el = cardRef.current;
    if (!el || prefersReducedMotion()) return;
    const a = animate(el.children, {
      opacity: [0, 1],
      translateY: [6, 0],
      delay: stagger(50),
      duration: 500,
      ease: "outCubic",
    });
    return () => {
      a.revert();
    };
  }, [focus]);

  // sites grouped by country, in the order they first appear
  const groups = useMemo(() => {
    const m = new Map<string, Site[]>();
    SITES.filter((s) => filter === "all" || s.kind === filter).forEach((s) =>
      m.set(s.country, [...(m.get(s.country) ?? []), s]),
    );
    return [...m.entries()];
  }, [filter]);
  const tabs: Filter[] = ["all", "teleport", "tower", "future"];

  return (
    <section id="network" className="dark relative overflow-hidden sec">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="eyebrow">Our teleports</p>
            <h2 className="h-section mt-4">
              14 locations in 7 countries. 13 more on the way.
            </h2>
            <p className="lead mt-4">
              Every plot is owned by LiveTelco or held on a long-term lease.
              Drag the globe, or pick a site in the list.
            </p>
          </div>
          <div
            role="tablist"
            aria-label="Filter sites"
            className="flex flex-wrap gap-1 rounded-lg border border-line p-1"
          >
            {tabs.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={filter === t}
                onClick={() => setFilter(t)}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  filter === t
                    ? "bg-white text-[#0b1626]"
                    : "text-muted hover:text-white"
                }`}
              >
                {t === "all" ? "All" : KIND_META[t].label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid items-center gap-8 lg:grid-cols-[1fr_340px]">
          {/* 3D globe with satellites, uplinks and the guided tour */}
          <div className="relative mx-auto aspect-square w-full max-w-[640px]">
            <div
              className={`absolute inset-[-12%] transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
            >
              <Globe
                onReady={() => setReady(true)}
                onFocusSite={setFocus}
                focusCity={hover}
              />
            </div>
            {focus && (
              <div
                ref={cardRef}
                key={focus.city}
                className="glass pointer-events-none absolute bottom-0 left-0 hidden w-64 rounded-xl p-4 shadow-2xl sm:block"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-medium text-white/80">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        background:
                          focus.kind === "future"
                            ? KIND_META.future.color
                            : "#2fd39a",
                      }}
                    />
                    {focus.kind === "future" ? "Coming soon" : "Operational"}
                  </span>
                  <span className="text-muted">
                    {KIND_META[focus.kind].label.replace(/s$/, "")}
                  </span>
                </div>
                <div className="mt-3 font-display text-xl font-semibold text-white">
                  {focus.city}
                </div>
                <div className="text-sm text-muted">{focus.country}</div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-xs">
                  <div>
                    <div className="text-muted">Sites in country</div>
                    <div className="mt-0.5 font-semibold text-white">
                      {siteCount(focus.country)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted">Colocation</div>
                    <div className="mt-0.5 font-semibold text-white">
                      Shared · Dedicated
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative z-10">
            <ul
              ref={listRef}
              className="max-h-[520px] overflow-y-auto rounded-xl border border-line bg-[#0a1626]/80 backdrop-blur"
              aria-label="Sites by country"
            >
              {groups.map(([country, list]) => (
                <li
                  key={country}
                  data-li
                  className="border-b border-line px-4 py-3.5 last:border-b-0"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-white">
                      {country}
                    </span>
                    <span className="text-xs text-muted">
                      {list.length} {list.length > 1 ? "sites" : "site"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {list.map((s) => (
                      <button
                        key={s.city}
                        onMouseEnter={() => setHover(s.city)}
                        onFocus={() => setHover(s.city)}
                        onClick={() => setHover(s.city)}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
                          focus?.city === s.city
                            ? "border-white/50 bg-white/10 text-white"
                            : "border-line text-[#c3cddb] hover:border-white/30"
                        }`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: KIND_META[s.kind].color }}
                        />
                        {s.city}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <ul className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
              {(["teleport", "tower", "future"] as const).map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: KIND_META[k].color }}
                  />
                  {KIND_META[k].label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
