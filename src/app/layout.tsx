import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import Intro from "@/components/intro/Intro";

// Poppins (the brand face, as on livetelco.com and the logo) for headings; Geist for text, Geist Mono for figures and labels.
const display = Poppins({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-poppins", display: "swap" });
const sans = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  // absolute URLs for the link-preview image; set SITE_URL where the site is deployed
  metadataBase: new URL(process.env.SITE_URL ?? "https://livetelco.com"),
  title: "LiveTelco — Teleport facilities for LEO satellite operators",
  description:
    "Licensed, approved and zoned teleports in 7 countries. Land, power, fibre, security and on-site teams for LEO satellite operators.",
};

export const viewport: Viewport = {
  themeColor: "#05090f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        {/* lets CSS hide [data-reveal] elements only when JS will animate them in */}
        <script dangerouslySetInnerHTML={{
            // js: [data-reveal] elements start hidden. intro-active / no-intro: first-visit intro (see Intro.tsx),
            // homepage only, skipped with "reduce motion" on (add ?intro to the URL to play it anyway).
            // Safety: if the app has not started within 4 s, show everything and drop the intro.
            __html:
              "var d=document.documentElement;d.classList.add('js');try{var rm=matchMedia('(prefers-reduced-motion: reduce)').matches;var seen=(localStorage.getItem('lt-intro-seen')||rm||location.pathname!=='/')&&location.search.indexOf('intro')<0;(seen?['no-intro']:['intro-active','intro-logo-pending']).forEach(function(k){d.classList.add(k)})}catch(e){d.classList.add('no-intro')}setTimeout(function(){if(!window.__ltReady){d.classList.remove('js','intro-active','intro-logo-pending');d.classList.add('no-intro')}},4000)",
          }} />
      </head>
      <body>
        <Intro />
        {children}
      </body>
    </html>
  );
}
