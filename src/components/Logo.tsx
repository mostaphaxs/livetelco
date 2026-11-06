import Image from "next/image";

// Official LiveTelco logo (background removed by scripts/make-logo.mjs).
export default function Logo({ className = "", height = 34 }: { className?: string; height?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="LiveTelco — Connect Anywhere"
      width={180}
      height={45}
      priority
      unoptimized
      className={className}
      style={{ height, width: "auto" }}
    />
  );
}
