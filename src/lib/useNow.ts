"use client";
import { useEffect, useState } from "react";

/**
 * The current time, refreshed every `every` ms and aligned to the clock
 * (a minute display ticks exactly when the minute changes). `null` until mounted,
 * so server and browser render the same HTML.
 */
export function useNow(every = 60_000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    let t: number;
    const tick = () => {
      const d = new Date();
      setNow(d);
      t = window.setTimeout(tick, every - (d.getTime() % every) + 20);
    };
    tick();
    return () => window.clearTimeout(t);
  }, [every]);
  return now;
}
