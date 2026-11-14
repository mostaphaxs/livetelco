"use client";

import { SITES, siteLocalTime } from "@/lib/locations";
import { useNow } from "@/lib/useNow";

const LIVE = SITES.filter((s) => s.kind !== "future");

/**
 * The operations strip: every live site with its local time, scrolling slowly like a
 * status board. Pauses under the pointer; a plain scrollable row with "reduce motion".
 */
export default function SiteTicker() {
  const now = useNow(60_000);
  const items = LIVE.map((s) => ({ ...s, t: now ? siteLocalTime(s.country, now).time : "--:--" }));
  const Track = ({ hidden = false }) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((s) => (
        <li key={s.city} className="flex items-center gap-2.5 whitespace-nowrap px-5 text-[13px]">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.kind === "tower" ? "#34d399" : "#f5a524" }} />
          <span className="font-medium text-white">{s.city}</span>
          <span className="text-[#8d9bb0]">{s.country}</span>
          <span className="text-[#8d9bb0] tabular-nums">{s.t}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="flex items-center border-t border-white/10" aria-label="Sites in operation, with their local time">
      <div className="flex shrink-0 items-center gap-2.5 border-r border-white/10 py-3 pl-[clamp(20px,5vw,96px)] pr-5 text-[13px] text-white">
        <span className="live-dot" aria-hidden="true" />
        All {LIVE.length} sites operational
      </div>
      <div className="ticker flex-1 py-3">
        <div className="ticker-track">
          <Track />
          <Track hidden />
        </div>
      </div>
    </div>
  );
}
