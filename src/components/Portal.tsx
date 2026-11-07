"use client";

import Signal from "./Signal";
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

const SITES = [
  { code: "Site XX1", where: "UAE · Dedicated", load: "24.0 kW", ok: true },
  {
    code: "Site XX2",
    where: "Saudi Arabia · Shared",
    load: "12.1 kW",
    ok: true,
  },
  { code: "Site XX3", where: "Egypt · Shared", load: "10.4 kW", ok: false },
];

export default function Portal() {
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
    { threshold: 0.2 },
  );

  return (
    <section ref={ref} id="portal" className="relative sec">
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
          <a href="#quote" data-anim="fade" className="btn btn-primary mt-10">
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
                <span className="text-muted">Demo Operator</span>
              </div>
              <span className="rounded-md bg-soft px-2 py-1 text-xs text-muted">
                Last 30 days
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
                  <th className="px-5 py-3 font-medium">Load</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line border-t border-line">
                {SITES.map((s) => (
                  <tr key={s.code} data-anim="row">
                    <td className="px-5 py-3.5 font-medium text-heading">
                      {s.code}
                    </td>
                    <td className="hidden px-5 py-3.5 text-muted sm:table-cell">
                      {s.where}
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-ink">
                      {s.load}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${s.ok ? "bg-green/10 text-green" : "bg-amber/15 text-[#a8640f]"}`}
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
