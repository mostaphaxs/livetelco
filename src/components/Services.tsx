"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import Signal from "./Signal";
import { useInView } from "@/lib/motion";
import { draw, fade, power, q, signal, timeline } from "@/lib/reveal";

const I = (d: string) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    data-anim="draw"
  >
    <path d={d} />
  </svg>
);

const SERVICES: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: "Security",
    body: "Premium with 24/7 guards, or Standard with automated access control, CCTV and NOC monitoring.",
    icon: I("M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4"),
  },
  {
    title: "Technical services",
    body: "Our teams install and maintain antennas on request — trained by and acting under the guidance of each operator.",
    icon: I(
      "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5z",
    ),
  },
  {
    title: "Site acquisition",
    body: "Need a new country? We find and acquire the land, then handle permits and greenfield construction.",
    icon: I(
      "M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
    ),
  },
  {
    title: "Connectivity",
    body: "100G+ fibre with redundancy across Tier 1 operators, and 500 kVA+ of power on a 99.5% SLA.",
    icon: I(
      "M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0M12 19.5h.01",
    ),
  },
];

export default function Services() {
  // the signal crosses, the colocation illustration switches on like a screen,
  // then the service cards appear and their icons draw themselves
  const ref = useInView<HTMLElement>(
    (el) => {
      const tl = timeline();
      signal(tl, el, 0);
      fade(tl, q(el, '[data-anim="fade"]'), 250);
      power(tl, q(el, '[data-anim="power"]'), 700);
      fade(tl, q(el, '[data-anim="card"]'), 1000, 110);
      draw(tl, q(el, '[data-anim="draw"]'), 1150, 140);
      return () => tl.revert();
    },
    { threshold: 0.12 },
  );

  return (
    <section ref={ref} id="services" className="soft relative sec">
      <Signal />
      <div className="container-x">
        <div className="grid items-end gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p data-anim="fade" className="eyebrow">
              Services
            </p>
            <h2 data-anim="fade" className="h-section mt-4">
              A facility provider, not an antenna operator.
            </h2>
          </div>
          <p data-anim="fade" className="lead max-w-md lg:justify-self-end">
            We provide everything around the antenna. You keep full control of
            your antennas and your network.
          </p>
        </div>

        {/* featured: colocation */}
        <article
          data-anim="fade"
          className="card mt-14 grid overflow-hidden lg:grid-cols-[1fr_1.15fr]"
        >
          <div className="p-8 sm:p-10">
            <h3 className="text-2xl font-semibold">Colocation</h3>
            <p className="mt-3 leading-relaxed text-muted">
              A fenced antenna area in a shared compound, or a whole teleport
              reserved for you. Power, fibre, shelters and people around your
              antennas.
            </p>
            <dl className="mt-8 grid gap-6 border-t border-line pt-6 sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-heading">Shared teleport</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted">
                  Several operators in one compound. Lower costs, shorter
                  timelines.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-heading">
                  Dedicated teleport
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted">
                  A complete site reserved for one operator, on a 3+ year
                  agreement.
                </dd>
              </div>
            </dl>
            <a href="#quote" className="link mt-8 inline-block text-sm">
              Ask for availability
            </a>
          </div>
          <div
            data-anim="power"
            className="relative min-h-[260px] bg-[#0b1220]"
          >
            <Image
              src="/media/scenes/coloc.webp"
              alt="A shared teleport with several operators next to a dedicated teleport for one operator"
              fill
              sizes="(min-width: 1024px) 600px, 100vw"
              className="object-contain p-6"
            />
          </div>
        </article>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <article
              key={s.title}
              data-anim="card"
              className="card card-hover p-7"
            >
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent/10 text-accent-ink">
                {s.icon}
              </div>
              <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {s.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
