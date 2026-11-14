"use client";
import { useEffect, useRef } from "react";

const fine = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/**
 * Spotlight cards: one pointermove listener on the container keeps `--mx/--my`
 * (the pointer in card coordinates) on every `.spot` card inside it. The light
 * itself is CSS (globals.css); nothing here runs when there is no mouse.
 */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host || !fine()) return;
    let raf = 0;
    let last: PointerEvent | null = null;
    const paint = () => {
      raf = 0;
      if (!last) return;
      for (const card of host.querySelectorAll<HTMLElement>(".spot")) {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${last.clientX - r.left}px`);
        card.style.setProperty("--my", `${last.clientY - r.top}px`);
      }
    };
    const onMove = (e: PointerEvent) => {
      last = e;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    host.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      host.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
  return ref;
}

/**
 * Magnetic buttons: a `.magnet` element is pulled a few pixels towards the pointer
 * while it is near, and settles back when it leaves (CSS transition on `translate`).
 * Feedback for a deliberate action; mouse only, off with "reduce motion".
 */
export function useMagnet<T extends HTMLElement>(strength = 0.22, reach = 56) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host || !fine() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = [...host.querySelectorAll<HTMLElement>(".magnet")];
    if (!items.length) return;
    let raf = 0;
    let last: PointerEvent | null = null;
    const paint = () => {
      raf = 0;
      if (!last) return;
      for (const el of items) {
        const r = el.getBoundingClientRect();
        const dx = last.clientX - (r.left + r.width / 2);
        const dy = last.clientY - (r.top + r.height / 2);
        const near = Math.abs(dx) < r.width / 2 + reach && Math.abs(dy) < r.height / 2 + reach;
        el.style.translate = near ? `${dx * strength}px ${dy * strength}px` : "";
      }
    };
    const onMove = (e: PointerEvent) => {
      last = e;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => items.forEach((el) => (el.style.translate = ""));
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [strength, reach]);
  return ref;
}
