"use client";
import { useEffect, useRef } from "react";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Runs `play` once, as soon as the element starts entering the screen.
 * `play` may return a cleanup (e.g. to revert anime.js animations).
 */
export function useInView<T extends HTMLElement>(
  play: (el: T) => void | (() => void),
  { threshold = 0, rootMargin = "0px 0px -6% 0px" } = {}
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
          el.classList.add("bg-in"); // starts the background transition ([data-bg-from], globals.css)
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
