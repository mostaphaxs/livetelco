"use client";

import Image from "next/image";

// Illustrations are stills from the LiveTelco film (scripts/make-scenes.mjs).
const STEPS = [
  {
    t: "Gate and fence",
    d: "Anti-climb fence, electronic gate and lighting around every plot.",
  },
  {
    t: "CCTV 24/7",
    d: "Night-vision cameras watched from our NOC. Every entry is logged.",
  },
  { t: "Your antennas", d: "Installed on prepared pads with a clear horizon." },
  {
    t: "Shelter and power",
    d: "Racks, cooling, grid feed and backup generator.",
  },
  {
    t: "Fibre to any carrier",
    d: "Carrier-neutral, with redundant Tier 1 links.",
  },
];

const CHECKS = [
  "Anti-climb fence and electronic gate",
  "24/7 IP CCTV with night vision",
  "Intrusion alerts to the NOC",
  "Full access log and audit trail",
];

export default function HowItWorks() {
  return (
    <section id="how" className="dark sec">
      <div className="container-x">
        <div className="grid items-end gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="eyebrow">How it works</p>
            <h2 className="h-section mt-4">
              You bring the antennas. We run everything around them.
            </h2>
          </div>
          <p className="lead max-w-md lg:justify-self-end">
            Land, licence, fence, power, shelter, fibre and the people on site
            are already in place, and operated by LiveTelco.
          </p>
        </div>

        <div className="frame mt-12">
          <Image
            src="/media/scenes/how.webp"
            alt="LiveTelco teleport: satellites link to your antennas, inside a fenced site with CCTV, shelter, generator and grid power"
            width={1240}
            height={560}
            sizes="(min-width: 1200px) 1120px, 100vw"
            className="w-full"
          />
        </div>

        <ol className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s.t} className="border-t border-line pt-4">
              <div className="text-sm font-semibold text-accent-ink tabular-nums">
                0{i + 1}
              </div>
              <div className="mt-1.5 font-display font-semibold text-heading">
                {s.t}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.d}</p>
            </li>
          ))}
        </ol>

        <div className="mt-20 grid gap-6 lg:grid-cols-2">
          <article className="card overflow-hidden">
            <div className="relative bg-[#0b1220]">
              <Image
                src="/media/scenes/teleport.webp"
                alt="Isometric view of a LiveTelco teleport compound with antennas, shelter and security"
                width={720}
                height={560}
                sizes="(min-width: 1024px) 560px, 100vw"
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
            <div className="p-7 sm:p-8">
              <h3 className="text-xl font-semibold">
                Our teleports. Your colocation.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Every plot is owned by LiveTelco or held on a long-term lease —
                shared or dedicated, with land, power, security and on-site
                teams.
              </p>
              <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-5">
                {[
                  ["14", "locations"],
                  ["99.5%", "power SLA"],
                  ["Neutral", "any carrier"],
                ].map(([v, k]) => (
                  <div key={k}>
                    <dt className="font-display text-lg font-semibold text-heading">
                      {v}
                    </dt>
                    <dd className="text-xs text-muted">{k}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </article>

          <article className="card overflow-hidden">
            <div className="bg-[#0b1220]">
              <Image
                src="/media/scenes/security.webp"
                alt="Fenced teleport with electronic gate, CCTV night vision and an intrusion alert sent to the NOC"
                width={740}
                height={600}
                sizes="(min-width: 1024px) 560px, 100vw"
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
            <div className="p-7 sm:p-8">
              <h3 className="text-xl font-semibold">Security comes first.</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                A security assessment before every site. Standard with automated
                access control, or Premium with 24/7 guards.
              </p>
              <ul className="mt-6 grid gap-2.5 border-t border-line pt-5 text-sm sm:grid-cols-2">
                {CHECKS.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-ink">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-green"
                    >
                      <path
                        d="M5 12.5l4.5 4.5L19 7.5"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
