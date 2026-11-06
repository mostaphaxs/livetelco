"use client";

import { createTimeline, stagger } from "animejs";
import type { PointerEvent } from "react";
import Logo from "./Logo";
import { useInView } from "@/lib/motion";

const NEWS = [
  { date: "30 Oct 2026", title: "ISO/IEC 27001 renewed for a 2nd year", body: "LiveTelco passed its ISO/IEC 27001:2022 certification audit for the second consecutive year.", hue: "from-cyan/30 to-indigo/30" },
  { date: "22 Sep 2026", title: "LiveTelco Egypt: one year in operation", body: "Back from Egypt after meetings with the local team, suppliers, customers, partners and officials.", hue: "from-amber/30 to-rose-500/20" },
  { date: "2 Sep 2026", title: "Speaking at ITW Africa & Datacloud Africa", body: "Partner Yves Nahas speaks in Nairobi on LEO satellite operators and teleports.", hue: "from-green/25 to-cyan/25" },
];

function magnet(e: PointerEvent<HTMLElement>) {
  const t = e.currentTarget;
  const r = t.getBoundingClientRect();
  const x = (e.clientX - r.left - r.width / 2) * 0.25;
  const y = (e.clientY - r.top - r.height / 2) * 0.35;
  t.style.transform = `translate(${x}px, ${y}px)`;
}
const unmagnet = (e: PointerEvent<HTMLElement>) => (e.currentTarget.style.transform = "");

export default function Closing() {
  const newsRef = useInView<HTMLDivElement>((el) => {
    const tl = createTimeline({ defaults: { ease: "outExpo" } })
      .add(el.querySelectorAll("[data-head]"), { opacity: [0, 1], translateY: [30, 0], duration: 1000 })
      .add(el.querySelectorAll("[data-news]"), { opacity: [0, 1], translateY: [60, 0], delay: stagger(120), duration: 1200 }, 150);
    return () => tl.revert();
  });
  const ctaRef = useInView<HTMLDivElement>((el) => {
    const tl = createTimeline({ defaults: { ease: "outExpo" } })
      .add(el, { opacity: [0, 1], scale: [0.94, 1], duration: 1400 })
      .add(el.querySelectorAll("[data-cta]"), { opacity: [0, 1], translateY: [24, 0], delay: stagger(110), duration: 1000 }, 250);
    return () => tl.revert();
  });

  return (
    <>
      <section id="news" className="py-28 sm:py-32">
        <div ref={newsRef} className="container-x">
          <div data-reveal data-head className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="h-display text-[clamp(2rem,4vw,3.2rem)]">Latest news</h2>
            <a href="#news" className="text-sm text-cyan hover:underline">
              All news & references →
            </a>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {NEWS.map((n) => (
              <article key={n.title} data-reveal data-news className="group glass overflow-hidden rounded-3xl transition-transform duration-500 hover:-translate-y-1.5">
                <div className={`relative h-40 overflow-hidden bg-gradient-to-br ${n.hue}`}>
                  <div className="grid-bg absolute inset-0 opacity-80 transition-transform duration-[1.2s] group-hover:scale-110" />
                  <span className="absolute bottom-4 left-5 font-mono text-xs text-ink/80">{n.date}</span>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-lg leading-snug">{n.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{n.body}</p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm text-cyan">
                    Read more <span className="transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="quote" className="pb-24">
        <div className="container-x">
          <div
            ref={ctaRef}
            data-reveal
            className="relative overflow-hidden rounded-[2rem] border border-cyan/20 bg-gradient-to-br from-[#0b2a4a] via-[#101a4a] to-[#2a1a5e] px-6 py-16 text-center sm:px-16 sm:py-24"
          >
            <div className="grid-bg absolute inset-0 opacity-50" />
            <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-cyan/30 blur-[100px]" />
            <div className="absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-indigo/40 blur-[110px]" />
            <div className="relative">
              <p data-reveal data-cta className="eyebrow justify-center">
                Ground station sites
              </p>
              <h2 data-reveal data-cta className="h-display mx-auto mt-5 max-w-3xl text-[clamp(2.2rem,5vw,4.2rem)]">
                Looking for a ground station site?
              </h2>
              <p data-reveal data-cta className="mx-auto mt-6 max-w-xl leading-relaxed text-ink/75">
                Share your target countries and requirements. We reply with available teleports, site documentation,
                timelines and a proposal.
              </p>
              <div data-reveal data-cta className="mt-10 flex flex-wrap justify-center gap-3">
                <a href="mailto:contact@livetelco.com" className="btn btn-primary" onPointerMove={magnet} onPointerLeave={unmagnet}>
                  Get a quote
                </a>
                <a href="https://wa.me/971561779548" className="btn btn-ghost" onPointerMove={magnet} onPointerLeave={unmagnet}>
                  WhatsApp us
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="container-x grid gap-10 py-14 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted">
              Building 029 – Office 089, SRTIP, Sharjah, United Arab Emirates
            </p>
            <div className="mt-4 space-y-1 text-sm text-muted">
              <a className="block hover:text-ink" href="mailto:contact@livetelco.com">contact@livetelco.com</a>
              <a className="block hover:text-ink" href="tel:+97145146792">+971 4 514 6792</a>
            </div>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-2 text-sm text-muted md:col-span-2 md:grid-cols-3">
            {["Services", "Security", "Our teleports", "How we work", "References", "Careers", "Microwave", "Resellers", "Client portal", "Code of conduct", "About us", "Contact"].map((l) => (
              <a key={l} href="#top" className="py-1 hover:text-ink">
                {l}
              </a>
            ))}
          </nav>
        </div>
        <div className="container-x flex flex-wrap justify-between gap-2 border-t border-line py-6 font-mono text-xs text-muted/70">
          <span>© 2026 LiveTelco</span>
          <span>ISO/IEC 27001:2022 certified</span>
        </div>
      </footer>
    </>
  );
}
