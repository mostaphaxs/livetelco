import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata: Metadata = { title: "Page not found · LiveTelco" };

/** 404: the signal line runs across the page and never finds its station. */
export default function NotFound() {
  return (
    <main className="dark relative grid min-h-svh place-items-center overflow-hidden bg-[#05090f] px-6">
      <div aria-hidden="true" className="lost-signal absolute inset-x-0 top-[74%]">
        <span className="lost-signal-head" />
      </div>
      <div className="relative z-10 flex max-w-md flex-col items-center text-center">
        <Link href="/" aria-label="LiveTelco home">
          <Logo height={44} />
        </Link>
        <p className="mt-14 font-mono text-xs uppercase tracking-[0.2em] text-[#07b6ff]">Error 404 · no carrier</p>
        <h1 className="mt-4 h-section text-white">This page lost its signal.</h1>
        <p className="lead mt-4">The link may be old, or the page has moved. The teleports are all where they should be.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-primary">
            Back to the homepage
          </Link>
          <Link href="/#network" className="btn btn-ghost">
            See our teleports
          </Link>
        </div>
      </div>
    </main>
  );
}
