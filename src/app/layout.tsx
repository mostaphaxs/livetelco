import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  weight: ["500", "600", "700"],
  display: "swap",
});
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jb", display: "swap" });

export const metadata: Metadata = {
  title: "LiveTelco — Teleport facilities for LEO satellite operators",
  description:
    "Licensed, approved and zoned teleports in 7 countries. Land, power, fibre, security and on-site teams for LEO satellite operators.",
};

export const viewport: Viewport = {
  themeColor: "#04070f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${display.variable} ${mono.variable}`}>
      <head>
        {/* lets CSS hide [data-reveal] elements only when JS will animate them in */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <link rel="preload" href="/land-dots.bin" as="fetch" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
