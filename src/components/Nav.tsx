"use client";

import { useEffect, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import Logo from "./Logo";

type Item = { href: string; label: string; children?: { href: string; label: string }[] };

// Same structure and wording as the livetelco.com header.
const LINKS: Item[] = [
  { href: "#top", label: "Home" },
  { href: "#how", label: "About Us" },
  {
    href: "#services",
    label: "Services",
    children: [
      { href: "#services", label: "All services" },
      { href: "#services", label: "Shared & dedicated teleports" },
      { href: "#compliance", label: "Security & compliance" },
      { href: "#portal", label: "24/7 NOC & client portal" },
      { href: "#network", label: "Locations" },
    ],
  },
  { href: "#network", label: "Our Teleports" },
  { href: "#news", label: "References" },
  { href: "https://livetelco.com/careers/", label: "Careers" },
  { href: "#quote", label: "Contact" },
];

function Dropdown({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const el = panel.current;
    if (!el || !open) return;
    const a = animate(el, { opacity: [0, 1], translateY: [8, 0], duration: 350, ease: "outExpo" });
    const b = animate(el.querySelectorAll("a"), { opacity: [0, 1], translateX: [-8, 0], delay: stagger(35), duration: 400, ease: "outExpo" });
    return () => {
      a.revert();
      b.revert();
    };
  }, [open]);

  const show = () => {
    window.clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    timer.current = window.setTimeout(() => setOpen(false), 120);
  };

  return (
    <li className="relative" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      <a href={item.href} className="nav-link inline-flex items-center gap-1.5" aria-haspopup="true" aria-expanded={open}>
        {item.label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          <path d="m2 3.5 3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
      {open && (
        <div ref={panel} className="absolute left-1/2 top-full w-64 -translate-x-1/2 pt-4">
          <div className="rounded-md border border-white/10 bg-[#0a1626] p-2 shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)]">
            {item.children!.map((c) => (
              <a key={c.label} href={c.href} className="block rounded px-3 py-2 text-[15px] font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white">
                {c.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // tells the safety timer in layout.tsx that the app started (reveal animations will run)
  useEffect(() => {
    (window as unknown as { __ltReady?: boolean }).__ltReady = true;
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = menuRef.current;
    if (!el || !open) return;
    const a = animate(el.querySelectorAll("[data-item]"), {
      opacity: [0, 1],
      translateY: [24, 0],
      delay: stagger(50, { start: 80 }),
      duration: 700,
      ease: "outExpo",
    });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      a.revert();
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`border-b transition-[background,border-color,box-shadow] duration-500 ${
          scrolled
            ? "border-white/10 bg-[#0a1626]/95 shadow-[0_10px_40px_-10px_rgba(0,0,0,.6)] backdrop-blur-md"
            : "border-white/10 bg-[#0a1626]"
        }`}
      >
        <nav className="container-x flex h-[72px] items-center justify-between gap-10" aria-label="Main">
          <a href="#top" aria-label="LiveTelco home" className="shrink-0">
            <Logo height={40} />
          </a>

          <ul className="hidden items-center gap-2 xl:flex">
            {LINKS.map((l) =>
              l.children ? (
                <Dropdown key={l.label} item={l} />
              ) : (
                <li key={l.label}>
                  <a href={l.href} className="nav-link">
                    {l.label}
                  </a>
                </li>
              )
            )}
          </ul>

          <div className="hidden items-center gap-2.5 xl:flex">
            <a href="#portal" className="btn-site btn-site-outline">
              Client Portal
            </a>
            <a href="#quote" className="btn-site btn-site-solid">
              Get a quote
            </a>
          </div>

          <button
            className="relative z-[60] grid h-11 w-11 place-items-center rounded border border-white/20 xl:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="relative block h-3 w-5">
              <span className={`absolute left-0 h-px w-5 bg-white transition-transform duration-300 ${open ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 h-px w-5 bg-white transition-transform duration-300 ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
            </span>
          </button>
        </nav>
      </div>

      {open && (
        <div ref={menuRef} className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[#0a1626] px-6 pb-10 pt-28 xl:hidden">
          {LINKS.map((l) => (
            <a
              key={l.label}
              data-item
              href={l.href}
              onClick={() => setOpen(false)}
              className="border-b border-white/10 py-4 text-2xl font-medium text-white"
            >
              {l.label}
            </a>
          ))}
          <div data-item className="mt-8 grid gap-3">
            <a href="#portal" onClick={() => setOpen(false)} className="btn-site btn-site-outline justify-center">
              Client Portal
            </a>
            <a href="#quote" onClick={() => setOpen(false)} className="btn-site btn-site-solid justify-center">
              Get a quote
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
