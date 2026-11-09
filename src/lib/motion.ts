"use client";
import { useEffect, useRef } from "react";
import { animate, cubicBezier } from "animejs";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Strong ease-out for UI (menus, dialogs): starts fast, settles softly. Same as --ease-out in globals.css. */
export const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

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
          if (!prefersReducedMotion()) cleanup = playRef.current(el);
          else {
            // "reduce motion": gentler, not nothing. One short fade, no movement
            // (CSS has already cleared the clip, scale and blur start states).
            const a = animate(el.querySelectorAll("[data-anim]"), { opacity: [0, 1], duration: 200, ease: "outQuad" });
            cleanup = () => a.revert();
          }
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
