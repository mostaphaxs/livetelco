"use client";

import type { ReactNode } from "react";

/** Event the Network section listens to: fly the globe to this country and highlight it in the list. */
export const COUNTRY_EVENT = "lt:country";
export const showCountry = (country: string) => window.dispatchEvent(new CustomEvent(COUNTRY_EVENT, { detail: country }));

/**
 * A country named anywhere on the page (news, portal…). Clicking it scrolls to the globe,
 * which flies to that country while its row lights up in the list.
 */
export default function CountryLink({ country, children, className = "" }: { country: string; children?: ReactNode; className?: string }) {
  return (
    <a
      href="#network"
      onClick={() => showCountry(country)}
      title={`Show ${country} on the globe`}
      className={`relative z-10 underline decoration-current/35 decoration-dotted underline-offset-[3px] transition-colors hover:decoration-solid ${className}`}
    >
      {children ?? country}
    </a>
  );
}
