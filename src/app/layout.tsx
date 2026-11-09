import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Intro from "@/components/intro/Intro";

// One family for headings and text, plus its mono for figures and labels.
const sans = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: "LiveTelco — Teleport facilities for LEO satellite operators",
  description:
    "Licensed, approved and zoned teleports in 7 countries. Land, power, fibre, security and on-site teams for LEO satellite operators.",
};

export const viewport: Viewport = {
  themeColor: "#050b14",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <head>
        {/* lets CSS hide [data-reveal] elements only when JS will animate them in */}
        <script dangerouslySetInnerHTML={{
            // js: [data-reveal] elements start hidden. intro-active / no-intro: first-visit intro (see Intro.tsx).
            // Safety: if the app has not started within 4 s, show everything and drop the intro.
            __html:
              "var d=document.documentElement;d.classList.add('js');try{var seen=localStorage.getItem('lt-intro-seen')&&location.search.indexOf('intro')<0;(seen?['no-intro']:['intro-active','intro-logo-pending']).forEach(function(k){d.classList.add(k)})}catch(e){d.classList.add('no-intro')}setTimeout(function(){if(!window.__ltReady){d.classList.remove('js','intro-active','intro-logo-pending');d.classList.add('no-intro')}},4000)",
          }} />
      </head>
      <body>
        <Intro />
        {children}
      </body>
    </html>
  );
}
