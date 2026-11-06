"use client";

import { useEffect, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import Logo from "./Logo";

const LINKS = [
  { href: "#services", label: "Services" },
  { href: "#network", label: "Teleports" },
  { href: "#compliance", label: "Compliance" },
  { href: "#portal", label: "Client portal" },
  { href: "#news", label: "News" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      delay: stagger(60, { start: 80 }),
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
        className={`transition-[background,border-color,backdrop-filter] duration-500 ${
          scrolled
            ? "border-b border-line bg-[#04070f]/70 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <nav className="container-x flex h-[72px] items-center justify-between" aria-label="Main">
          <a href="#top" aria-label="LiveTelco home">
            <Logo />
          </a>

          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="group relative rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-ink"
                >
                  {l.label}
                  <span className="absolute inset-x-4 -bottom-0.5 h-px origin-left scale-x-0 bg-gradient-to-r from-cyan to-indigo transition-transform duration-300 group-hover:scale-x-100" />
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-3 lg:flex">
            <a href="#portal" className="btn btn-ghost !h-10 text-sm">
              Sign in
            </a>
            <a href="#quote" className="btn btn-primary !h-10 text-sm">
              Get a quote
            </a>
          </div>

          <button
            className="relative z-[60] grid h-11 w-11 place-items-center rounded-full border border-line lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="relative block h-3 w-5">
              <span
                className={`absolute left-0 h-px w-5 bg-ink transition-transform duration-300 ${
                  open ? "top-1.5 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 h-px w-5 bg-ink transition-transform duration-300 ${
                  open ? "top-1.5 -rotate-45" : "top-3"
                }`}
              />
            </span>
          </button>
        </nav>
      </div>

      {open && (
        <div
          ref={menuRef}
          className="fixed inset-0 z-50 flex flex-col bg-[#04070f]/95 px-6 pt-28 backdrop-blur-xl lg:hidden"
        >
          {LINKS.map((l) => (
            <a
              key={l.href}
              data-item
              href={l.href}
              onClick={() => setOpen(false)}
              className="h-display border-b border-line py-5 text-3xl"
            >
              {l.label}
            </a>
          ))}
          <a data-item href="#quote" onClick={() => setOpen(false)} className="btn btn-primary mt-8 justify-center">
            Get a quote
          </a>
        </div>
      )}
    </header>
  );
}
