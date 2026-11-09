"use client";

import { useEffect, useId, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import Logo from "./Logo";
import { EASE_OUT, prefersReducedMotion } from "@/lib/motion";

type Child = { href: string; label: string; note: string };
type Item = { href: string; label: string; children?: Child[]; sections?: string[]; external?: boolean };

// Same labels as the livetelco.com header ("Home" is the logo).
// `sections` = section ids that highlight the link while they are on screen.
const LINKS: Item[] = [
  { href: "#how", label: "About Us", sections: ["how"] },
  {
    href: "#services",
    label: "Services",
    sections: ["services", "compliance", "portal"],
    children: [
      { href: "#services", label: "Colocation", note: "Shared or dedicated teleports" },
      { href: "#compliance", label: "Security & compliance", note: "Licensed, zoned, ISO 27001" },
      { href: "#portal", label: "24/7 NOC & client portal", note: "Every site, followed live" },
    ],
  },
  { href: "#network", label: "Our Teleports", sections: ["network"] },
  { href: "#news", label: "References", sections: ["news"] },
  { href: "https://livetelco.com/careers/", label: "Careers", external: true },
  { href: "#quote", label: "Contact", sections: ["quote"] },
];

const PHONE = { label: "+971 4 514 6792", href: "tel:+97145146792" };
const EMAIL = "contact@livetelco.com";
const WHATSAPP = "https://wa.me/971561779548";

const isActive = (l: Item, active: string | null) => !!active && !!l.sections?.includes(active);

/** Id of the section crossing the middle of the screen. */
function useActiveSection() {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const ids = [...new Set(LINKS.flatMap((l) => l.sections ?? []))];
    const onScreen = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? onScreen.add(e.target.id) : onScreen.delete(e.target.id)));
        setActive(ids.filter((id) => onScreen.has(id)).pop() ?? null);
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return active;
}

/** Fully transparent over the hero, solid below it; slides away while scrolling down, back when scrolling up. */
function useScrollState(locked: boolean) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  useEffect(() => {
    let lastY = window.scrollY;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const dy = y - lastY;
      // fully transparent for as long as the bar sits over the hero; solid from the next section on
      const hero = document.getElementById("top");
      const heroEnd = hero ? hero.offsetTop + hero.offsetHeight - 72 : 24;
      setScrolled(y > heroEnd);
      if (lockedRef.current || y < 160) setHidden(false);
      else if (dy > 8) setHidden(true);
      else if (dy < -8) setHidden(false);
      if (Math.abs(dy) > 8) lastY = y;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return { scrolled, hidden: hidden && !locked };
}

function Dropdown({ item, active, onOpenChange }: { item: Item; active: boolean; onOpenChange: (o: boolean) => void }) {
  const [open, setOpenState] = useState(false);
  const root = useRef<HTMLLIElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  // animate only when opened with the pointer; keyboard-opened menus appear instantly
  const animateOpen = useRef(false);
  const id = useId();
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const setOpen = (o: boolean) => {
    setOpenState(o);
    onOpenChangeRef.current(o);
  };

  useEffect(() => {
    const el = panel.current;
    if (!el || !open) return;
    // the panel only, 180 ms (dropdown budget 150–250 ms); no per-link stagger on something opened this often
    const a =
      animateOpen.current && !prefersReducedMotion()
        ? animate(el, { opacity: [0, 1], translateY: [6, 0], duration: 180, ease: EASE_OUT })
        : null;
    const close = () => {
      setOpenState(false);
      onOpenChangeRef.current(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      close();
      button.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      a?.revert();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  // mouse: opens on hover. touch / keyboard: the button toggles it.
  const onEnter = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    window.clearTimeout(timer.current);
    animateOpen.current = true;
    setOpen(true);
  };
  const onLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    timer.current = window.setTimeout(() => setOpen(false), 140);
  };

  return (
    <li
      ref={root}
      className="relative"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        className={`nav-link inline-flex items-center gap-1.5 ${active ? "is-active" : ""}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          animateOpen.current = e.detail > 0; // detail 0 = Enter / Space
          setOpen(!open);
        }}
      >
        {item.label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className={`transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}>
          <path d="m2 3.5 3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div ref={panel} id={id} hidden={!open} className="absolute left-1/2 top-full w-72 -translate-x-1/2 pt-3">
        <div className="rounded-lg border border-white/10 bg-[#0a1626] p-2 shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)]">
          {item.children!.map((c) => (
            <a
              key={c.label}
              href={c.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2.5 transition-colors hover:bg-white/5 focus-visible:bg-white/5"
            >
              <span className="block text-[15px] font-medium text-white">{c.label}</span>
              <span className="block text-[13px] text-white/55">{c.note}</span>
            </a>
          ))}
        </div>
      </div>
    </li>
  );
}

function MobileMenu({ active, onClose }: { active: string | null; onClose: (refocus: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [sub, setSub] = useState(false);
  const subId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const el = ref.current!;
    // a menu opened often must feel instant: 250 ms, small rise, tight stagger (fade only with reduced motion)
    const reduce = prefersReducedMotion();
    const a = animate(el.querySelectorAll("[data-item]"), {
      opacity: [0, 1],
      translateY: reduce ? 0 : [8, 0],
      delay: stagger(30),
      duration: reduce ? 150 : 250,
      ease: EASE_OUT,
    });
    // focus trap: Tab cycles through the menu and the close button
    const focusables = () =>
      [document.querySelector<HTMLElement>("[data-menu-toggle]"), ...el.querySelectorAll<HTMLElement>("a[href], button")].filter(
        (n): n is HTMLElement => !!n && n.offsetParent !== null
      );
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onCloseRef.current(true);
      if (e.key !== "Tab") return;
      const f = focusables();
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    el.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: true });
    return () => {
      a.revert();
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, []);

  const go = () => onClose(false);
  const row = "flex w-full items-center justify-between border-b border-white/10 py-4 text-left text-2xl font-medium";

  return (
    <div
      ref={ref}
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="fixed inset-0 z-40 flex flex-col overflow-y-auto overscroll-contain bg-[#0a1626] px-6 pb-8 pt-24 lg:hidden"
    >
      <nav aria-label="Mobile">
        {LINKS.map((l) =>
          l.children ? (
            <div key={l.label} data-item>
              <button type="button" className={`${row} ${isActive(l, active) ? "text-[#07b6ff]" : "text-white"}`} aria-expanded={sub} aria-controls={subId} onClick={() => setSub((v) => !v)}>
                {l.label}
                <svg width="16" height="16" viewBox="0 0 10 10" fill="none" aria-hidden="true" className={`transition-transform duration-200 motion-reduce:transition-none ${sub ? "rotate-180" : ""}`}>
                  <path d="m2 3.5 3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div id={subId} hidden={!sub} className="border-b border-white/10 py-2">
                {l.children.map((c) => (
                  <a key={c.label} href={c.href} onClick={go} className="block py-2.5 pl-4">
                    <span className="block text-lg font-medium text-white">{c.label}</span>
                    <span className="block text-sm text-white/55">{c.note}</span>
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <a
              key={l.label}
              data-item
              href={l.href}
              onClick={go}
              aria-current={isActive(l, active) ? "true" : undefined}
              className={`${row} ${isActive(l, active) ? "text-[#07b6ff]" : "text-white"}`}
              {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {l.label}
            </a>
          )
        )}
      </nav>

      <div data-item className="mt-8 grid gap-3">
        <a href="#quote" onClick={go} className="btn-site btn-site-solid h-12 justify-center text-base">
          Get a quote
        </a>
        <a href="#portal" onClick={go} className="btn-site btn-site-outline h-12 justify-center text-base">
          Client Portal
        </a>
      </div>

      {/* phone visitors are the most likely to call or message straight away */}
      <div data-item className="mt-auto pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/45">Talk to us</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <a href={PHONE.href} className="mobile-contact">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" strokeLinejoin="round" />
            </svg>
            Call
          </a>
          <a href={`mailto:${EMAIL}`} className="mobile-contact">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            Email
          </a>
          <a href={WHATSAPP} className="mobile-contact" target="_blank" rel="noopener noreferrer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2m0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2m4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3" />
            </svg>
            WhatsApp
          </a>
        </div>
        <p className="mt-4 text-sm text-white/55">
          {PHONE.label} · {EMAIL}
        </p>
      </div>
    </div>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const active = useActiveSection();
  const { scrolled, hidden } = useScrollState(open || dropdownOpen);

  // tells the safety timer in layout.tsx that the app started (reveal animations will run)
  useEffect(() => {
    (window as unknown as { __ltReady?: boolean }).__ltReady = true;
  }, []);

  const closeMenu = (refocus: boolean) => {
    setOpen(false);
    if (refocus) toggle.current?.focus();
  };

  const solid = scrolled || open;

  return (
    <>
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-transform duration-[250ms] ease-[cubic-bezier(.23,1,.32,1)] motion-reduce:transition-none has-[:focus-visible]:translate-y-0 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div
        className={`border-b transition-[background-color,border-color,box-shadow] duration-500 ${
          solid
            ? "border-white/10 bg-[#0a1626]/92 shadow-[0_10px_40px_-10px_rgba(0,0,0,.6)] backdrop-blur-xl backdrop-saturate-150"
            : "border-transparent bg-transparent"
        }`}
      >
        <nav className="container-x flex h-[72px] items-center justify-between gap-6" aria-label="Main">
          <a href="#top" aria-label="LiveTelco home" className="shrink-0">
            <Logo height={40} />
          </a>

          <ul className="hidden items-center gap-0 lg:flex xl:gap-1.5">
            {LINKS.map((l) =>
              l.children ? (
                <Dropdown key={l.label} item={l} active={isActive(l, active)} onOpenChange={setDropdownOpen} />
              ) : (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className={`nav-link ${isActive(l, active) ? "is-active" : ""}`}
                    aria-current={isActive(l, active) ? "true" : undefined}
                    {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {l.label}
                  </a>
                </li>
              )
            )}
          </ul>

          <div className="hidden items-center gap-2.5 lg:flex">
            <a href="#portal" className="btn-site btn-site-outline">
              Client Portal
            </a>
            <a href="#quote" className="btn-site btn-site-solid">
              Get a quote
            </a>
          </div>

          <button
            ref={toggle}
            data-menu-toggle
            className="relative z-[60] grid h-11 w-11 place-items-center rounded border border-white/20 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="relative block h-3 w-5">
              {/* both lines sit on the centre line and move with transforms only, so they glide into the cross
                  (changing `top` would make them jump before rotating) */}
              <span className={`absolute left-0 top-1.5 h-px w-5 bg-white transition-transform duration-200 ease-[cubic-bezier(.23,1,.32,1)] motion-reduce:transition-none ${open ? "rotate-45" : "-translate-y-1.5"}`} />
              <span className={`absolute left-0 top-1.5 h-px w-5 bg-white transition-transform duration-200 ease-[cubic-bezier(.23,1,.32,1)] motion-reduce:transition-none ${open ? "-rotate-45" : "translate-y-1.5"}`} />
            </span>
          </button>
        </nav>
      </div>

    </header>
    {/* outside <header>: its slide transform would otherwise trap this fixed overlay inside the bar */}
    {open && <MobileMenu active={active} onClose={closeMenu} />}
    </>
  );
}
