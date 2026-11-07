import Image from "next/image";

// Official LiveTelco logo, cut out of info/Logo.jpeg by scripts/make-logo.mjs
// (617x160 transparent PNG, ~4x the nav display size so it stays sharp on retina).
export default function Logo({ className = "", height = 40 }: { className?: string; height?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="LiveTelco — Connect Anywhere"
      width={617}
      height={160}
      priority
      unoptimized
      className={className}
      style={{ height, width: "auto" }}
    />
  );
}
