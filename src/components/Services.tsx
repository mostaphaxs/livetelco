"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import Signal from "./Signal";
import {
  AcquisitionArt,
  ConnectivityArt,
  SecurityArt,
  TechnicalArt,
} from "./ServiceArt";
import { useInView } from "@/lib/motion";
import { fade, power, q, signal, timeline, trace } from "@/lib/reveal";

// each service is drawn, in the film's line style, by the same signal stroke as the logo
const SERVICES: { title: string; body: string; art: ReactNode }[] = [
  {
    title: "Security",
    body: "Premium with 24/7 guards, or Standard with automated access control, CCTV and NOC monitoring.",
    art: <SecurityArt />,
  },
  {
    title: "Technical services",
    body: "Our teams install and maintain antennas on request — trained by and acting under the guidance of each operator.",
    art: <TechnicalArt />,
  },
  {
    title: "Site acquisition",
    body: "Need a new country? We find and acquire the land, then handle permits and greenfield construction.",
    art: <AcquisitionArt />,
  },
  {
    title: "Connectivity",
    body: "100G+ fibre with redundancy across Tier 1 operators, and 500 kVA+ of power on a 99.5% SLA.",
    art: <ConnectivityArt />,
  },
];

export default function Services() {
  // the signal crosses, the colocation illustration switches on like a screen,
  // then the service cards appear and their drawings are traced in, one after the other
  const ref = useInView<HTMLElement>((el) => {
    const tl = timeline();
    signal(tl, el, 0);
    fade(tl, q(el, '[data-anim="fade"]'), 250);
    power(tl, q(el, '[data-anim="power"]'), 700);
    fade(tl, q(el, '[data-anim="card"]'), 1000, 110);
    trace(tl, q(el, '[data-anim="trace"]'), 1100, 260);
    return () => tl.revert();
  });

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
            <h3 className="font-display text-2xl font-semibold tracking-[-0.015em]">
              Colocation
            </h3>
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
              className="card card-hover overflow-hidden"
            >
              <div className="aspect-[2/1] border-b border-line bg-[#0b1220] px-3 pt-2">
                {s.art}
              </div>
              <div className="p-6 pt-5">
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {s.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
