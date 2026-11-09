"use client";

import { animate, stagger } from "animejs";
import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "./globe/Globe";
import Signal from "./Signal";
import { COUNTRY_EVENT } from "./CountryLink";
import { EASE_OUT, prefersReducedMotion, useInView } from "@/lib/motion";
import { fade, q, signal, timeline } from "@/lib/reveal";
import { useNow } from "@/lib/useNow";
import { KIND_META, SITES, siteLocalTime, type Site, type SiteKind } from "@/lib/locations";

type Filter = "all" | SiteKind;

const siteCount = (country: string) =>
  SITES.filter((s) => s.country === country && s.kind !== "future").length;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, "-");

export default function Network() {
  const [filter, setFilter] = useState<Filter>("all");
  const [hover, setHover] = useState<string | null>(null);
  const [focus, setFocus] = useState<Site | null>(null);
  const [lit, setLit] = useState<string | null>(null); // country highlighted from elsewhere on the page
  const [ready, setReady] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const now = useNow(60_000);
  // (filtering the list is instant: re-fading it on every click added nothing)

  // soft cross-fade of the site card each time the globe moves to another site
  useEffect(() => {
    const el = cardRef.current;
    if (!el || prefersReducedMotion()) return;
    const a = animate(el.children, {
      opacity: [0, 1],
      translateY: [6, 0],
      delay: stagger(40),
      duration: 300,
      ease: EASE_OUT,
    });
    return () => {
      a.revert();
    };
  }, [focus]);

  // a country named elsewhere on the page (news, portal) was clicked: fly there and light its row
  useEffect(() => {
    let t = 0;
    const onCountry = (e: Event) => {
      const country = (e as CustomEvent<string>).detail;
      const site = SITES.find((s) => s.country === country && s.kind !== "future") ?? SITES.find((s) => s.country === country);
      if (!site) return;
      setFilter("all");
      setHover(null);
      requestAnimationFrame(() => setHover(site.city)); // re-fires even if this city was already chosen
      setLit(country);
      window.clearTimeout(t);
      t = window.setTimeout(() => setLit(null), 2800);
      // bring the row into view inside the list only (never scroll the page from here)
      requestAnimationFrame(() => {
        const list = listRef.current;
        const row = list?.querySelector<HTMLElement>(`#country-${slug(country)}`);
        if (list && row) list.scrollTo({ top: row.offsetTop - 8, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      });
    };
    window.addEventListener(COUNTRY_EVENT, onCountry);
    return () => {
      window.removeEventListener(COUNTRY_EVENT, onCountry);
      window.clearTimeout(t);
    };
  }, []);

  // sites grouped by country, in the order they first appear
  const groups = useMemo(() => {
    const m = new Map<string, Site[]>();
    SITES.filter((s) => filter === "all" || s.kind === filter).forEach((s) =>
      m.set(s.country, [...(m.get(s.country) ?? []), s]),
    );
    return [...m.entries()];
  }, [filter]);
  const tabs: Filter[] = ["all", "teleport", "tower", "future"];
  const TAB_LABEL: Record<Filter, string> = { all: "All", teleport: "Teleports", tower: "Towers", future: "Planned" };

  // the signal crosses, then the countries come online one after another
  const ref = useInView<HTMLElement>(
    (el) => {
      const tl = timeline();
      signal(tl, el, 0);
      fade(tl, q(el, '[data-anim="fade"]'), 250);
      fade(tl, q(el, '[data-anim="country"]'), 700, 110);
      return () => tl.revert();
    },
  );

  const local = focus && now ? siteLocalTime(focus.country, now) : null;

  return (
    <section
      ref={ref}
      id="network"
      className="dark relative overflow-hidden sec"
      data-bg-from="white"
    >
      <Signal />
      <div className="container-x">
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_340px] lg:gap-10">
          {/* the section opens on the globe itself: the heading sits over its top-left corner */}
          <div className="relative">
            {/* a soft fade of the section colour behind the heading keeps it readable over the Earth */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-40 -top-32 z-[5] hidden h-[520px] w-[760px] bg-[radial-gradient(closest-side,var(--navy)_50%,transparent)] opacity-0 transition-opacity delay-500 duration-700 lg:block [.bg-in_&]:opacity-100"
            />
            <div className="relative z-10 max-w-md lg:pointer-events-none lg:absolute lg:left-0 lg:top-0">
              <h2 data-anim="fade" className="h-section [text-shadow:0_2px_24px_rgba(5,9,15,.9)]">
                14 locations in 7 countries.{" "}
                <span className="text-[#8d9bb0]">13 more on the way.</span>
              </h2>
              <p data-anim="fade" className="lead mt-4 max-w-sm [text-shadow:0_2px_16px_rgba(5,9,15,.9)]">
                Every plot is owned by LiveTelco or held on a long-term lease. Drag the globe, or pick a site.
              </p>
            </div>

            {/* 3D globe with satellites, uplinks and the guided tour */}
            <div className="relative mx-auto mt-6 aspect-square w-full max-w-[600px] lg:mr-0 lg:mt-28">
              {!ready && <GlobeLoader />}
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
                      <div className="text-muted">Local time</div>
                      <div className="mt-0.5 font-semibold text-white tabular-nums">
                        {local ? (
                          <>
                            {local.time}{" "}
                            <span className="font-normal text-muted">{local.offset}</span>
                          </>
                        ) : (
                          "–"
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted">Sites in country</div>
                      <div className="mt-0.5 font-semibold text-white tabular-nums">
                        {siteCount(focus.country) || "In development"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10 lg:pt-2">
            <div
              data-anim="fade"
              role="group"
              aria-label="Filter sites"
              className="mb-3 grid grid-cols-4 gap-1 rounded-lg border border-line p-1"
            >
              {tabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={filter === t}
                  onClick={() => setFilter(t)}
                  className={`rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                    filter === t
                      ? "bg-white text-[#0b1626]"
                      : "text-muted hover:text-white"
                  }`}
                >
                  {TAB_LABEL[t]}
                </button>
              ))}
            </div>
            <ul
              ref={listRef}
              className="relative max-h-[520px] overflow-y-auto overscroll-contain rounded-xl border border-line bg-[#0a1626]/80 backdrop-blur"
              aria-label="Sites by country"
            >
              {groups.map(([country, list]) => (
                <li
                  key={country}
                  id={`country-${slug(country)}`}
                  data-anim="country"
                  className={`border-b border-line px-4 py-3.5 transition-colors duration-500 last:border-b-0 ${
                    lit === country ? "bg-[#07b6ff]/12" : ""
                  }`}
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
                        type="button"
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

/** While three.js and the textures load: the globe's outline, with the signal sweeping round it. */
function GlobeLoader() {
  return (
    <div className="absolute inset-0 grid place-items-center" role="status">
      <svg viewBox="0 0 200 200" className="absolute inset-[6%] h-[88%] w-[88%]" aria-hidden="true">
        <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="0.6" />
        <ellipse cx="100" cy="100" rx="92" ry="34" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="0.5" />
        <ellipse cx="100" cy="100" rx="34" ry="92" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="0.5" />
        <g className="origin-center animate-[spin_1.8s_linear_infinite] motion-reduce:animate-none" style={{ transformBox: "view-box" }}>
          <circle cx="100" cy="100" r="92" fill="none" stroke="#07b6ff" strokeWidth="1" strokeLinecap="round" strokeDasharray="70 508" />
        </g>
      </svg>
      <span className="text-xs text-muted">Loading the globe…</span>
    </div>
  );
}
