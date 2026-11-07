import type { Metadata, Viewport } from "next";
import { Inter, Poppins, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Intro from "@/components/intro/Intro";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
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
  themeColor: "#050b14",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${display.variable} ${mono.variable}`}>
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
