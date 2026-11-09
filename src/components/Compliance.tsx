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
  // the approvals are granted one by one, left to right: the signal runs along the track
  // and each tick draws itself as it passes
  const ref = useInView<HTMLElement>(
    (el) => {
      const tl = timeline();
      signal(tl, el, 0);
      fade(tl, q(el, '[data-anim="fade"]'), 250);
      const track = q(el, '[data-anim="track"]');
      if (track.length)
        tl.add(track, { opacity: [0, 1], duration: 1 }, 650).add(track, { scaleX: [0, 1], duration: 1300, ease: "inOutQuad" }, 650);
      fade(tl, q(el, '[data-anim="row"]'), 650, 320);
      draw(tl, q(el, '[data-anim="draw"]'), 760, 320);
      return () => tl.revert();
    },
  );

  return (
    <section ref={ref} id="compliance" className="relative sec" data-bg-from="navy">
      <Signal />
      <div className="container-x">
        {/* opens on the statement itself, large, with the proof beside it */}
        <div className="grid items-end gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
          <h2 data-anim="fade" className="h-section max-w-[16ch] text-[clamp(2rem,4.2vw,3.4rem)]">
            Licensed, approved and zoned for satellite.
          </h2>
          <div>
            <p data-anim="fade" className="lead max-w-md">
              Every LiveTelco teleport comes with its licence, local-authority approvals and the zoning that allows RF
              and satellite operations. Operators install on land that is ready, not on a promise.
            </p>
            <div data-anim="fade" className="mt-6 inline-flex items-center gap-3 rounded-lg bg-soft px-4 py-3 text-sm">
              <span className="font-semibold text-heading">ISO/IEC 27001:2022</span>
              <span className="text-muted">certified for the second year</span>
            </div>
          </div>
        </div>

        {/* the four approvals on one track */}
        <ol className="relative mt-14 grid gap-8 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-8">
          <span aria-hidden="true" className="absolute inset-x-0 top-[11px] hidden h-px bg-line lg:block" />
          <span
            aria-hidden="true"
            data-anim="track"
            className="absolute inset-x-0 top-[11px] hidden h-px origin-left bg-green/60 lg:block"
          />
          {ROWS.map((r) => (
            <li key={r.title} data-anim="row" className="relative">
              <span className="relative inline-block bg-[var(--bg)] pr-3">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  data-anim="draw"
                  className="text-green"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".3" strokeWidth="1.5" />
                  <path d="M7.5 12.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div className="mt-4 text-lg font-semibold tracking-[-0.011em] text-heading">{r.title}</div>
              <div className="mt-1 text-sm text-muted">{r.note}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
