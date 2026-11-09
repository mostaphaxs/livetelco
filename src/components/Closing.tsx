"use client";

import Image from "next/image";
import Logo from "./Logo";
import Signal from "./Signal";
import CountryLink from "./CountryLink";
import { SITES } from "@/lib/locations";
import { useInView } from "@/lib/motion";
import { develop, fade, power, q, signal, timeline } from "@/lib/reveal";

const NEWS = [
  {
    date: "2026-10-30",
    href: "https://livetelco.com/references/#post-2026-10-30-iso-iec-27001-renewed-for-a-2nd-year",
    tag: "Certification",
    title: "ISO/IEC 27001 renewed for a second year",
    body: "LiveTelco passed its ISO/IEC 27001:2022 certification audit for the second consecutive year.",
    img: "/media/scenes/security.webp",
  },
  {
    date: "2026-09-22",
    href: "https://livetelco.com/references/#post-2026-09-22-livetelco-egypt-one-year-in-operation",
    tag: "Egypt",
    title: "LiveTelco Egypt: one year in operation",
    body: "Back from Egypt after meetings with the local team, suppliers, customers, partners and officials.",
    img: "/media/scenes/land.webp",
  },
  {
    date: "2026-09-02",
    href: "https://livetelco.com/references/#post-2026-09-02-speaking-at-itw-africa-datacloud-africa",
    tag: "Events",
    title: "Speaking at ITW Africa & Datacloud Africa",
    body: "Partner Yves Nahas speaks in Nairobi on LEO satellite operators and teleports.",
    img: "/media/scenes/serve.webp",
  },
];

// news dates: ISO in the data, formatted for display (UTC, so server and browser agree)
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// on-page sections where this page covers the topic, livetelco.com pages otherwise
const SITE = "https://livetelco.com";
const FOOTER: { title: string; links: [string, string][] }[] = [
  {
    title: "Company",
    links: [
      ["About us", "#how"],
      ["References", `${SITE}/references/`],
      ["Careers", `${SITE}/careers/`],
      ["Code of conduct", `${SITE}/code-of-conduct/`],
    ],
  },
  {
    title: "Services",
    links: [
      ["Colocation", "#services"],
      ["Security", "#compliance"],
      ["Microwave", `${SITE}/microwave/`],
      ["Resellers", `${SITE}/resellers/`],
    ],
  },
  {
    title: "Teleports",
    links: [
      ["Our teleports", "#network"],
      ["Client portal", `${SITE}/portal/`],
      ["Contact", "#quote"],
    ],
  },
];

export default function Closing() {
  // news: the photos develop, from blurred and grey to sharp and in colour
  const newsRef = useInView<HTMLElement>(
    (el) => {
      const tl = timeline();
      signal(tl, el, 0);
      fade(tl, q(el, '[data-anim="fade"]'), 250);
      fade(tl, q(el, '[data-anim="card"]'), 500, 150);
      develop(tl, q(el, '[data-anim="develop"]'), 550, 150);
      return () => tl.revert();
    },
  );
  // contact: the block opens from a line of light, like a link coming up
  const ctaRef = useInView<HTMLDivElement>(
    (el) => {
      const tl = timeline();
      power(tl, q(el, '[data-anim="power"]'), 0);
      fade(tl, q(el, '[data-anim="cta"]'), 600, 120);
      return () => tl.revert();
    },
  );

  return (
    <>
      <section ref={newsRef} id="news" className="soft relative sec">
        <Signal />
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p data-anim="fade" className="eyebrow">
                News
              </p>
              <h2 data-anim="fade" className="h-section mt-4">
                Latest from LiveTelco
              </h2>
            </div>
            <a href={`${SITE}/references/`} data-anim="fade" className="link text-sm">
              All news and references
            </a>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {NEWS.map((n) => (
              <article
                key={n.title}
                data-anim="card"
                className="card card-hover group relative flex flex-col overflow-hidden has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-[var(--accent-ink)]"
              >
                <div
                  data-anim="develop"
                  className="relative aspect-[16/9] overflow-hidden bg-[#0b1220]"
                >
                  <Image
                    src={n.img}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 380px, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="text-xs text-muted">
                    {/* a country tag shows that country on the globe */}
                    {SITES.some((s) => s.country === n.tag) ? (
                      <CountryLink country={n.tag} className="font-semibold text-accent-ink" />
                    ) : (
                      <span className="font-semibold text-accent-ink">{n.tag}</span>
                    )}
                    <time dateTime={n.date} className="ml-3">
                      {dateFmt.format(new Date(n.date))}
                    </time>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold leading-snug">
                    {/* the whole card is clickable through this link (after:inset-0) */}
                    <a href={n.href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
                      {n.title}
                    </a>
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {n.body}
                  </p>
                  <span aria-hidden="true" className="link mt-auto pt-5 text-sm group-hover:underline group-hover:underline-offset-4">
                    Read more
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="quote" className="soft pb-24">
        <div ref={ctaRef} className="container-x">
          <div
            data-anim="power"
            className="dark grid items-center gap-8 rounded-2xl px-8 py-12 sm:px-14 sm:py-16 lg:grid-cols-[1.4fr_1fr]"
          >
            <div>
              <h2 data-anim="cta" className="h-section">
                Looking for a ground station site?
              </h2>
              <p data-anim="cta" className="lead mt-4 max-w-xl">
                Share your target countries and requirements. We reply with
                available teleports, site documentation, timelines and a
                proposal.
              </p>
            </div>
            <div
              data-anim="cta"
              className="flex flex-wrap gap-3 lg:justify-end"
            >
              <a
                href="mailto:contact@livetelco.com"
                className="btn btn-primary"
              >
                Get a quote
              </a>
              <a href="https://wa.me/971561779548" className="btn btn-ghost">
                WhatsApp us
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="dark">
        <div className="container-x grid gap-12 py-16 md:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo />
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-muted">
              Building 029 – Office 089, SRTIP, Sharjah, United Arab Emirates
            </p>
            <div className="mt-4 space-y-1 text-sm">
              <a
                className="block text-muted hover:text-white"
                href="mailto:contact@livetelco.com"
              >
                contact@livetelco.com
              </a>
              <a
                className="block text-muted hover:text-white"
                href="tel:+97145146792"
              >
                +971 4 514 6792
              </a>
            </div>
          </div>
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3"
          >
            {FOOTER.map((col) => (
              <div key={col.title}>
                <div className="font-semibold text-white">{col.title}</div>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <a href={href} className="text-muted transition-colors hover:text-white">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="container-x flex flex-wrap justify-between gap-2 border-t border-line py-6 text-xs text-muted">
          <span>© 2026 LiveTelco. All rights reserved.</span>
          <span>ISO/IEC 27001:2022 certified</span>
        </div>
      </footer>
    </>
  );
}
