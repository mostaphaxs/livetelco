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
export function useMagnet<T extends HTMLElement>(strength = 0.22, reach = 24, max = 6) {
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
      // Only the one button closest to the pointer moves, and never further than `max` px:
      // two neighbours pulled at once (or one pulled by its full width) slide over each other.
      let pick: HTMLElement | null = null;
      let pickGap = Infinity;
      let px = 0;
      let py = 0;
      for (const el of items) {
        // measured without the current pull, so the button does not chase its own movement
        const r = el.getBoundingClientRect();
        const [ox, oy] = (el.style.translate || "0px 0px").split(" ").map(parseFloat);
        const dx = last.clientX - (r.left - ox + r.width / 2);
        const dy = last.clientY - (r.top - (oy || 0) + r.height / 2);
        const gx = Math.max(0, Math.abs(dx) - r.width / 2);
        const gy = Math.max(0, Math.abs(dy) - r.height / 2);
        const gap = Math.hypot(gx, gy); // 0 when the pointer is on the button
        if (gap < reach && gap < pickGap) {
          pick = el;
          pickGap = gap;
          px = Math.max(-max, Math.min(max, dx * strength));
          py = Math.max(-max, Math.min(max, dy * strength));
        }
      }
      for (const el of items) el.style.translate = el === pick ? `${px}px ${py}px` : "";
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
  }, [strength, reach, max]);
  return ref;
}
