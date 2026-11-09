"use client";

import { useEffect, useState } from "react";
import Signal from "./Signal";
import CountryLink from "./CountryLink";
import { useInView } from "@/lib/motion";
import { count, fade, power, q, signal, timeline } from "@/lib/reveal";

const FEATURES = [
  ["Power and costs", "Allocation and consumption per site."],
  ["Visits", "Requests and the gate log."],
  ["Security", "CCTV and incident reports."],
  ["Maintenance", "Generator and electrical register."],
  ["Tickets", "24/7 NOC follow-up."],
  ["Documents", "Contracts, invoices and reports."],
];

// a sample operator account on three real LiveTelco sites
const SITES = [
  { site: "Ras Al Khaimah", country: "UAE", plan: "Dedicated", kw: 24.0, ok: true },
  { site: "Riyadh", country: "Saudi Arabia", plan: "Shared", kw: 12.1, ok: true },
  { site: "Suez", country: "Egypt", plan: "Shared", kw: 10.4, ok: false },
];

const REFRESH_S = 15;

/** The sample feed: every 15 s a refresh nudges each load by up to ±0.2 kW; the header counts the seconds since. */
function useLiveFeed() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const refresh = Math.floor(tick / REFRESH_S);
  // deterministic wobble per refresh (same on server and first client render: refresh 0 = the base values)
  const loads = SITES.map((s, i) => (refresh === 0 ? s.kw : Math.round((s.kw + Math.sin(refresh * 12.9898 + i * 78.233) * 0.2) * 10) / 10));
  return { age: tick % REFRESH_S, loads };
}

export default function Portal() {
  const { age, loads } = useLiveFeed();
  // the dashboard boots: the screen switches on, the figures count up, the rows load
  const ref = useInView<HTMLElement>(
    (el) => {
      const tl = timeline();
      signal(tl, el, 0);
      fade(tl, q(el, '[data-anim="fade"]'), 250, 70);
      power(tl, q(el, '[data-anim="power"]'), 500);
      count(tl, q(el, "[data-count]"), 1100);
      fade(tl, q(el, '[data-anim="row"]'), 1200, 160);
      return () => tl.revert();
    },
  );

  return (
    <section ref={ref} id="portal" className="relative sec" data-bg-from="navy">
      <Signal />
      <div className="container-x grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <p data-anim="fade" className="eyebrow">
            Client portal
          </p>
          <h2 data-anim="fade" className="h-section mt-4">
            Every teleport, followed live.
          </h2>
          <p data-anim="fade" className="lead mt-5">
            Each operator sees its own sites, with two-step sign-in and access
            managed by the operator&apos;s own admin.
          </p>
          <dl className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {FEATURES.map(([k, v]) => (
              <div key={k} data-anim="fade">
                <dt className="font-semibold text-heading">{k}</dt>
                <dd className="mt-0.5 text-sm text-muted">{v}</dd>
              </div>
            ))}
          </dl>
          <a href="https://livetelco.com/portal/" data-anim="fade" className="btn btn-primary mt-10">
            Sign in to the portal
          </a>
        </div>

        {/* simplified product screenshot */}
        <figure>
          <div
            data-anim="power"
            className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_40px_80px_-40px_rgba(11,22,38,.35)]"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-display font-semibold text-heading">
                  Overview
                </span>
                <span className="text-muted">Sample operator</span>
              </div>
              <span className="flex items-center gap-2 text-xs text-muted tabular-nums" aria-live="off">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-green/60 [animation-duration:2.4s] motion-reduce:hidden" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-green" />
                </span>
                {age === 0 ? "Updated just now" : `Updated ${age} s ago`}
              </span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
              {[
                ["Power availability", "100.00%"],
                ["Open tickets", "1"],
                ["Visit requests", "1 pending"],
              ].map(([k, v]) => (
                <div key={k} className="px-5 py-4">
                  <div className="text-xs text-muted">{k}</div>
                  <div
                    data-count
                    className="mt-1 font-display text-lg font-semibold text-heading sm:text-xl"
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">Site</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">
                    Location
                  </th>
                  <th className="px-5 py-3 text-right font-medium">Load</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line border-t border-line">
                {SITES.map((s, i) => (
                  <tr key={s.site} data-anim="row" className="transition-colors duration-150 hover:bg-soft">
                    <td className="px-5 py-3.5 font-medium text-heading">
                      {s.site}
                    </td>
                    <td className="hidden px-5 py-3.5 text-muted sm:table-cell">
                      <CountryLink country={s.country} /> · {s.plan}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-ink">
                      {loads[i].toFixed(1)} kW
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${s.ok ? "bg-green/10 text-[#0b7a52]" : "bg-amber/15 text-[#8a5208]"}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {s.ok ? "Normal" : "Maintenance"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <figcaption className="mt-3 text-xs text-muted">
            Sample account shown.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
