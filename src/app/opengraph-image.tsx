import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// The card shown when a link to the site is shared (LinkedIn, WhatsApp, Slack, X…).
export const alt = "LiveTelco: teleport facilities for LEO satellite operators";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const dataUri = async (file: string, type: string) =>
  `data:${type};base64,${(await readFile(join(process.cwd(), "public", file))).toString("base64")}`;

export default async function Image() {
  const [logo, film] = await Promise.all([dataUri("logo.png", "image/png"), dataUri("media/hero-poster.jpg", "image/jpeg")]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#05090f", position: "relative" }}>
        {/* the film's still, flush right, as in the hero */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={film} alt="" width={620} height={349} style={{ position: "absolute", right: 0, top: 140, borderRadius: "16px 0 0 16px" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 0 64px 72px", width: 540, height: "100%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" width={247} height={64} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, color: "#fff" }}>
              Teleport facilities for LEO satellite operators.
            </div>
            <div style={{ marginTop: 24, fontSize: 26, color: "#b9c3d1" }}>Our land, your colocation.</div>
          </div>
          {/* the signal line */}
          <div style={{ display: "flex", height: 2, width: 420, background: "linear-gradient(90deg, #07b6ff, rgba(7,182,255,0))" }} />
        </div>
      </div>
    ),
    size
  );
}
