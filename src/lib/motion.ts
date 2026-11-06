"use client";
import { useEffect, useRef } from "react";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Runs `play` once when the element first scrolls into view.
 * `play` may return a cleanup (e.g. to revert anime.js animations).
 */
export function useInView<T extends HTMLElement>(
  play: (el: T) => void | (() => void),
  { threshold = 0.2, rootMargin = "0px 0px -10% 0px" } = {}
) {
  const ref = useRef<T>(null);
  const playRef = useRef(play);
  playRef.current = play;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cleanup: void | (() => void);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          io.disconnect();
          cleanup = playRef.current(el);
        }
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (typeof cleanup === "function") cleanup();
    };
  }, [threshold, rootMargin]);

  return ref;
}
