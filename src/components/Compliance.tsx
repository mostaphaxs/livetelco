"use client";

import Signal from "./Signal";
import { useInView } from "@/lib/motion";
import { draw, fade, q, signal, timeline } from "@/lib/reveal";

const ROWS = [
  {
    title: "Land owned or on long-term lease",
    note: "Title checked and held by a LiveTelco local entity.",
  },
  {
    title: "Zoned for RF and satellite use",
    note: "Industrial land with a clear horizon and no interference.",
  },
  {
    title: "Local approvals in place",
    note: "Permits, aviation, environment and civil defence.",
  },
  { title: "Site licence in place", note: "Ready for operators to install." },
];

export default function Compliance() {
  // the approvals are granted one by one: each row appears, then its tick draws itself
  const ref = useInView<HTMLElement>(
    (el) => {
      const tl = timeline();
      signal(tl, el, 0);
      fade(tl, q(el, '[data-anim="fade"]'), 250);
      fade(tl, q(el, '[data-anim="row"]'), 650, 380);
      draw(tl, q(el, '[data-anim="draw"]'), 900, 380);
      return () => tl.revert();
    },
  );

  return (
    <section ref={ref} id="compliance" className="relative sec" data-bg-from="navy">
      <Signal />
      <div className="container-x grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div>
          <p data-anim="fade" className="eyebrow">
            Every LiveTelco teleport
          </p>
          <h2 data-anim="fade" className="h-section mt-4">
            Licensed, approved and zoned for satellite.
          </h2>
          <p data-anim="fade" className="lead mt-5 max-w-md">
            Each site comes with its licence, local-authority approvals and the
            zoning that allows RF and satellite operations. Operators install on
            land that is ready — not on a promise.
          </p>
          <div
            data-anim="fade"
            className="mt-8 inline-flex items-center gap-3 rounded-lg bg-soft px-4 py-3 text-sm"
          >
            <span className="font-semibold text-heading">
              ISO/IEC 27001:2022
            </span>
            <span className="text-muted">certified for the second year</span>
          </div>
        </div>

        <ol className="divide-y divide-line border-y border-line">
          {ROWS.map((r, i) => (
            <li key={r.title} data-anim="row" className="flex gap-5 py-6">
              <span className="font-display text-sm font-semibold text-accent-ink tabular-nums">
                0{i + 1}
              </span>
              <div className="flex-1">
                <div className="text-lg font-semibold tracking-[-0.011em] text-heading">
                  {r.title}
                </div>
                <div className="mt-1 text-sm text-muted">{r.note}</div>
              </div>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                data-anim="draw"
                className="mt-1 shrink-0 text-green"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeOpacity=".3"
                  strokeWidth="1.5"
                />
                <path
                  d="M7.5 12.5l3 3 6-6.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
