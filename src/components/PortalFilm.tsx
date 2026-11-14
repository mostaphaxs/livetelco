"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ConnectivityArt, SecurityArt, TechnicalArt } from "./ServiceArt";

/*
  The client portal, as a short film that plays by itself: a cursor walks through the six
  screens of the real portal (customer-admin view) and uses them. It is not interactive.

  It is drawn in code, not rendered to a video file: the "film" is a 960×600 stage that is
  scaled to the width available, so it stays sharp on any screen and weighs nothing.
  One clock (`t`, in ms) drives everything; each scene lasts SCENE_MS and reads its own
  local time to decide what has happened yet. All names and figures are sample data.
*/
const W = 960;
const H = 600;
const SCENE_MS = 5200;

const NAV = ["Overview", "Site status & SLA", "Access & visits", "Security & CCTV", "Tickets & documents", "Users & permissions"];
const CAPTIONS = [
  "Every teleport on one screen: power, battery and network, live.",
  "The maintenance register for the equipment serving your installation.",
  "Request a site visit; the site team answers within 4 working hours.",
  "Live cameras on your area. Recordings are kept 90 days.",
  "Tickets with response targets: critical 15 min, high 1 h, normal 4 h.",
  "Your own admin decides, per teleport, what each person sees.",
];
const ICONS = [
  "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  "M3 12h4l3-7 4 14 3-7h4",
  "M5 6h14v14H5zM5 10h14M9 3v4M15 3v4",
  "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  "M7 3h8l4 4v14H7zM10 12h6M10 16h6",
  "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M17 11a3 3 0 1 0-1-5.8M18 14.5a5.5 5.5 0 0 1 3.5 5.5",
];

// The cursor's script. Per scene: when it sets off (`at`), where to (a [data-target] on the
// stage), how long the move takes, and whether it clicks on arrival. A click lands
// CLICK_LAG ms after the cursor stops, the way a hand settles before it presses; the scenes
// react at that same moment (their own thresholds: 1500, 1700…).
type Cue = { at: number; target: string; dur: number; click?: boolean };
const CLICK_LAG = 120;
const next = (i: number): Cue => ({ at: 4050, target: `nav-${(i + 1) % NAV.length}`, dur: 780, click: true });
const SCRIPT: Cue[][] = [
  [{ at: 500, target: "kpi", dur: 900 }, next(0)],
  [{ at: 560, target: "site-b", dur: 820, click: true }, next(1)],
  [{ at: 700, target: "submit", dur: 880, click: true }, next(2)],
  [{ at: 720, target: "cam-1", dur: 760, click: true }, next(3)],
  [{ at: 640, target: "new-ticket", dur: 740, click: true }, next(4)],
  [{ at: 600, target: "user-1", dur: 950 }, next(5)],
];
// "minimum jerk": the speed profile of a real hand movement (slow, fast, slow, no sudden change)
const reach = (p: number) => p * p * p * (10 - 15 * p + 6 * p * p);

/* ------------------------------------------------------------------ charts */
// integer hash, so the server and the browser draw exactly the same curve (Math.sin does not guarantee that)
const rnd = (i: number) => (Math.imul(i + 1, 2654435761) >>> 8) % 1000 / 1000;
const r1 = (n: number) => Math.round(n * 10) / 10;
// battery %: slow discharge, three recharges while grid or generator is present
const BATTERY = Array.from({ length: 60 }, (_, i) => {
  const charging = (i >= 8 && i < 16) || (i >= 38 && i < 46) || i >= 56;
  return charging ? 96 + rnd(i) * 3 : 62 - ((i * 7) % 23) * 0.5 + rnd(i) * 4;
});
const batteryPath = BATTERY.map((v, i) => `${i ? "L" : "M"}${r1((i / 59) * 300)} ${r1(70 - (v / 100) * 64)}`).join("");
const THROUGHPUT = Array.from({ length: 64 }, (_, i) => (rnd(i + 3) > 0.28 ? 0.72 + rnd(i) * 0.25 : 0.12 + rnd(i) * 0.2));
const throughputPath = `M0 70${THROUGHPUT.map((v, i) => `V${r1(70 - v * 62)}H${r1(((i + 1) / 64) * 300)}`).join("")}V70Z`;

/* ------------------------------------------------------------- small parts */
const Card = ({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div style={style} className={`rounded-xl border border-white/[0.08] bg-[#1a222d] ${className}`}>
    {children}
  </div>
);
const Chip = ({ tone, children, delay = 0 }: { tone: "green" | "violet" | "blue" | "amber" | "grey"; children: ReactNode; delay?: number }) => {
  const c = {
    green: "bg-[#12331f] text-[#6ee7a0]",
    violet: "bg-[#2a2350] text-[#c4b8ff]",
    blue: "bg-[#12314a] text-[#7cc8ff]",
    amber: "bg-[#3a2a10] text-[#f5c26b]",
    grey: "bg-white/[0.06] text-[#aab4c2]",
  }[tone];
  return (
    <span className={`pf-pop inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${c}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </span>
  );
};
const Title = ({ t, s, right }: { t: string; s: string; right?: ReactNode }) => (
  <div className="mb-4 flex items-start justify-between">
    <div>
      <div className="font-display text-[22px] font-semibold tracking-[-0.02em] text-white">{t}</div>
      <div className="mt-0.5 text-[12.5px] text-[#8d9bb0]">{s}</div>
    </div>
    {right}
  </div>
);
const Label = ({ children }: { children: ReactNode }) => (
  <div className="mb-2 border-b border-white/[0.08] pb-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white">{children}</div>
);
const Btn = ({ children, target, primary }: { children: ReactNode; target?: string; primary?: boolean }) => (
  <span
    data-target={target}
    className={`inline-flex h-9 items-center rounded-lg px-4 text-[12.5px] font-semibold ${primary ? "bg-[#8b7cf6] text-[#0f0b24]" : "border border-white/15 text-white"}`}
  >
    {children}
  </span>
);
const Field = ({ label, value, className = "" }: { label: string; value: string; className?: string }) => (
  <div className={className}>
    <div className="mb-1 text-[11.5px] font-medium text-white">{label}</div>
    <div className="flex h-9 items-center justify-between rounded-lg border border-white/[0.12] bg-[#141b24] px-3 text-[12px] text-[#c9d2de]">
      {value}
      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <path d="m2 3.5 3 3 3-3" stroke="#8d9bb0" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  </div>
);

/* ------------------------------------------------------------------ scenes */
function Overview({ local, clock }: { local: number; clock: number }) {
  const tx = (373.6 + Math.sin(clock / 1400) * 9).toFixed(1);
  return (
    <>
      <Title
        t="Overview"
        s="Teleports hosting your equipment."
        right={
          <div className="flex gap-2">
            <Btn>Open a ticket</Btn>
            <Btn primary>Request a site visit</Btn>
          </div>
        }
      />
      <div className="grid grid-cols-4 gap-3" data-target="kpi">
        {[
          ["Power availability · 30 d", "100.00%", "SLA 99.5%"],
          ["Open tickets", "0", "Nothing open"],
          ["Visit requests", "0 pending", "1 approved"],
          ["Teleports", "2", "2 in service"],
        ].map(([k, v, s], i) => (
          <Card key={k} className="pf-rise px-4 py-3" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="truncate text-[11px] text-[#8d9bb0]">{k}</div>
            <div className="mt-1 font-display text-[21px] font-semibold text-white tabular-nums">{v}</div>
            <div className="text-[10.5px] text-[#8d9bb0]">{s}</div>
          </Card>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Card className="pf-rise p-4" style={{ animationDelay: "260ms" }}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-semibold text-white">Bakkish</div>
              <div className="text-[11px] text-[#8d9bb0]">Bakkish tower, Lebanon</div>
            </div>
            <Chip tone="green">Leased</Chip>
          </div>
          <Label>Electricity · live</Label>
          <div className="rounded-lg bg-[#12331f] px-3 py-2 text-[11.5px] text-[#6ee7a0]">
            <b>Grid or generator present</b> · battery 95%
          </div>
          <div className="mt-2 flex justify-between text-[11.5px]">
            <span className="text-[#aab4c2]">Battery</span>
            <span className="font-semibold text-white">95% · 54.6 V · charging</span>
          </div>
          <svg viewBox="0 0 300 74" className="mt-2 h-[112px] w-full rounded-lg bg-white">
            {[
              [8, 16],
              [38, 46],
              [56, 60],
            ].map(([a, b]) => (
              <rect key={a} x={(a / 59) * 300} y="4" width={((b - a) / 59) * 300} height="66" fill="#d7f2e1" />
            ))}
            <path d="M0 37H300" stroke="#e6e9ee" strokeWidth="0.6" />
            <path d={batteryPath} pathLength={1} className="pf-draw" fill="none" stroke="#4f3fd6" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
          <div className="mt-1.5 text-[10.5px] text-[#8d9bb0]">Battery charge · last 24 h · from the site inverter</div>
        </Card>
        <Card className="pf-rise p-4" style={{ animationDelay: "340ms" }}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-semibold text-white">Vavatsinia</div>
              <div className="text-[11px] text-[#8d9bb0]">Vavatsinia tower, Cyprus</div>
            </div>
            <Chip tone="green">Leased</Chip>
          </div>
          <Label>Network · live from the LiveTelco NOC</Label>
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-white">Gateway link</span>
            <Chip tone="green">Up</Chip>
          </div>
          <div className="mt-0.5 text-[11px] text-[#8d9bb0]">uptime 10 d 6 h · latency 172 ms</div>
          <div className="mt-2 flex justify-between text-[11.5px]">
            <span className="text-[#aab4c2]">RF Tx throughput</span>
            <span className="text-white tabular-nums">
              Now <b>{tx} Mb/s</b> · Max <b>1.29 Gb/s</b>
            </span>
          </div>
          <svg viewBox="0 0 300 74" className="mt-2 h-[112px] w-full rounded-lg bg-white">
            <path d="M0 22H300M0 46H300" stroke="#f1d3d3" strokeWidth="0.5" />
            <g className="pf-wipe">
              <path d={throughputPath} fill="#a9a6dc" stroke="#2a22c9" strokeWidth="0.7" />
            </g>
          </svg>
          <div className="mt-1.5 text-[10.5px] text-[#8d9bb0]">RF Tx throughput · last 24 h{local > 2600 ? " · updated just now" : ""}</div>
        </Card>
      </div>
    </>
  );
}

function SiteStatus({ local }: { local: number }) {
  const b = local >= 1500; // the cursor switched to the second site
  const rows = b
    ? [
        ["Diesel generator", "12 Oct", "12 Jan", "OK"],
        ["UPS & batteries", "3 Nov", "3 Feb", "OK"],
        ["Cooling / HVAC", "28 Aug", "28 Nov", "Due soon"],
        ["CCTV, lighting & alarms", "20 Oct", "20 Jan", "OK"],
        ["Fence, gate & civil works", "1 Sep", "1 Mar", "OK"],
      ]
    : [
        ["Diesel generator", "2 Nov", "2 Feb", "OK"],
        ["Fuel tank & fuel level", "2 Nov", "2 Dec", "OK"],
        ["Automatic transfer switch (ATS)", "15 Sep", "15 Dec", "OK"],
        ["UPS & batteries", "21 Oct", "21 Jan", "OK"],
        ["Earthing & lightning protection", "6 Jun", "6 Dec", "Due soon"],
      ];
  return (
    <>
      <Title
        t="Site status & SLA"
        s={`${b ? "Vavatsinia tower, Cyprus" : "Bakkish tower, Lebanon"} · Shared · Standard security`}
        right={
          <div className="flex gap-2 text-[12.5px] font-semibold">
            <span className={`rounded-full px-4 py-1.5 ${b ? "border border-white/15 text-white" : "bg-[#8b7cf6] text-[#0f0b24]"}`}>Bakkish</span>
            <span data-target="site-b" className={`rounded-full px-4 py-1.5 ${b ? "bg-[#8b7cf6] text-[#0f0b24]" : "border border-white/15 text-white"}`}>
              Vavatsinia
            </span>
          </div>
        }
      />
      <Card className="p-5">
        <div className="text-[14px] font-semibold text-white">Maintenance register</div>
        <div className="mb-3 text-[11.5px] text-[#8d9bb0]">Equipment serving your installation and its service schedule</div>
        <div className="grid grid-cols-[1.6fr_.7fr_.7fr_.6fr] border-b border-white/[0.08] pb-2 text-[11px] font-medium text-[#8d9bb0]">
          <span>Equipment</span>
          <span>Last service</span>
          <span>Next due</span>
          <span>Status</span>
        </div>
        <div key={String(b)}>
          {rows.map(([e, l, n, s], i) => (
            <div key={e} className="pf-rise grid grid-cols-[1.6fr_.7fr_.7fr_.6fr] items-center border-b border-white/[0.06] py-2.5 text-[12px]" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="text-white">{e}</span>
              <span className="text-[#aab4c2] tabular-nums">{l}</span>
              <span className="text-[#aab4c2] tabular-nums">{n}</span>
              <span>
                <Chip tone={s === "OK" ? "green" : "amber"} delay={250 + i * 90}>
                  {s}
                </Chip>
              </span>
            </div>
          ))}
        </div>
      </Card>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {[
          ["Power", ["Grid feed", "Generator"], "Normal"],
          ["Environment", ["Equipment shelter", "Humidity"], "Normal"],
          ["Connectivity", ["Fibre path 1", "Fibre path 2"], "Up"],
        ].map(([t, items, v]) => (
          <Card key={t as string} className="px-4 py-3">
            <div className="mb-1.5 text-[12.5px] font-semibold text-white">{t}</div>
            {(items as string[]).map((it) => (
              <div key={it} className="flex justify-between py-0.5 text-[11.5px]">
                <span className="text-[#aab4c2]">{it}</span>
                <span className="font-semibold text-white">{v}</span>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </>
  );
}

function Visits({ local }: { local: number }) {
  const sent = local >= 1700;
  const approved = local >= 3300;
  return (
    <>
      <Title t="Access & visits" s="Requests go to the LiveTelco site team, usually answered within 4 working hours." />
      <div className="grid grid-cols-[1.1fr_1fr] gap-3">
        <Card className="p-5">
          <div className="mb-3 text-[14px] font-semibold text-white">New visit request</div>
          <Field label="Teleport" value="Bakkish" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Date" value="Thu 19 November" />
            <Field label="Time window" value="08:00–12:00" />
          </div>
          <Field className="mt-3" label="Purpose" value="Preventive maintenance" />
          <div className="mt-3 text-[11.5px] font-medium text-white">Visitors</div>
          <div className="mt-1 flex h-9 items-center gap-2 rounded-lg border border-white/[0.12] bg-[#141b24] px-3 text-[12px] text-[#c9d2de]">
            2 engineers <span className="text-[#8d9bb0]">· ID copies attached</span>
          </div>
          <div data-target="submit" className={`mt-4 flex h-10 items-center rounded-lg px-4 text-[12.5px] font-semibold text-[#0f0b24] transition-colors duration-300 ${sent ? "bg-[#6f61d8]" : "bg-[#8b7cf6]"}`}>
            {sent ? "Request sent" : "Submit request"}
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-3 text-[14px] font-semibold text-white">Your visit requests</div>
          {sent ? (
            <div className="pf-rise rounded-lg border border-white/[0.08] bg-[#141b24] p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-white">Bakkish · Thu 19 November</span>
                <span key={String(approved)}>
                  <Chip tone={approved ? "green" : "blue"}>{approved ? "Approved" : "Pending"}</Chip>
                </span>
              </div>
              <div className="mt-1 text-[11.5px] text-[#8d9bb0]">08:00–12:00 · Preventive maintenance · 2 visitors</div>
              {approved && <div className="pf-rise mt-2.5 border-t border-white/[0.08] pt-2.5 text-[11.5px] text-[#6ee7a0]">Gate pass issued. The guards have your visitors&apos; names.</div>}
            </div>
          ) : (
            <div className="text-[12px] text-[#8d9bb0]">No visit requests yet.</div>
          )}
        </Card>
      </div>
    </>
  );
}

const CAMS = [
  { name: "Camera 1 · Shelter", art: <ConnectivityArt /> },
  { name: "Camera 2 · Antenna yard", art: <TechnicalArt /> },
  { name: "Camera 3 · Gate", art: <SecurityArt /> },
];
function Cctv({ local, clock }: { local: number; clock: number }) {
  const cam = local >= 1600 ? 1 : 0;
  const stamp = new Date(Date.UTC(2026, 10, 15, 0, 9, 15) + Math.floor(clock / 1000) * 1000).toISOString().slice(0, 19).replace("T", " ");
  return (
    <>
      <Title t="Security & CCTV" s="Recordings are kept 90 days; clips are released through a ticket." />
      <div className="grid grid-cols-[1.75fr_1fr] gap-3">
        <Card className="p-4">
          {/* camera views are drawings, not footage */}
          <div key={cam} className="pf-fade pf-cam relative h-[300px] overflow-hidden rounded-lg bg-[#0b1220] px-16 py-6">
            {CAMS[cam].art}
            <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded bg-black/50 px-2 py-0.5 text-[10.5px] font-semibold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff5d5d]" /> LIVE
            </span>
            <span className="absolute right-3 top-3 text-[11px] text-white/80 tabular-nums">{stamp}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11.5px]">
            <span className="font-medium text-white">{CAMS[cam].name}</span>
            <span className="text-[#8d9bb0]">1 s ago</span>
          </div>
          <div className="mt-2.5 flex gap-2.5">
            {CAMS.map((c, i) => (
              <div key={c.name} data-target={`cam-${i}`} className={`pf-cam h-[62px] w-[110px] overflow-hidden rounded-md bg-[#0b1220] p-1.5 ${cam === i ? "outline outline-2 outline-[#3fc5ff]" : ""}`}>
                {c.art}
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[14px] font-semibold text-white">Security level</span>
            <Chip tone="violet">Standard</Chip>
          </div>
          <ul className="space-y-2.5 text-[12px] text-[#c9d2de]">
            {["Automated gate with badge and PIN", "CCTV on perimeter, gate and antenna yard", "Intrusion and door alarms to the NOC", "Remote video verification of every alarm", "Guard dispatch on alarm"].map((x, i) => (
              <li key={x} className="pf-rise flex gap-2" style={{ animationDelay: `${150 + i * 70}ms` }}>
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#8d9bb0]" />
                {x}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

function Tickets({ local }: { local: number }) {
  const opened = local >= 1500;
  const replied = local >= 3100;
  return (
    <>
      <Title t="Tickets & documents" s="Response targets: Critical 15 min · High 1 h · Normal 4 h, around the clock." right={<Btn primary target="new-ticket">New ticket</Btn>} />
      <div className="mb-3 flex gap-6 border-b border-white/[0.08] text-[12.5px] font-semibold">
        <span className="border-b-2 border-[#8b7cf6] pb-2 text-white">Tickets</span>
        <span className="pb-2 text-[#8d9bb0]">Documents</span>
      </div>
      <Card className="p-5">
        {opened ? (
          <div className="pf-rise">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-white">CCTV clip request · Bakkish gate, 14 Nov 22:00–23:00</span>
              <span key={String(replied)}>
                <Chip tone={replied ? "green" : "blue"}>{replied ? "NOC replied" : "Open"}</Chip>
              </span>
            </div>
            <div className="mt-1 text-[11.5px] text-[#8d9bb0]">Security / CCTV clip · Normal · response target 4 h</div>
            {replied && (
              <div className="pf-rise mt-3 rounded-lg bg-[#141b24] p-3 text-[12px] text-[#c9d2de]">
                <b className="text-white">LiveTelco NOC</b> <span className="text-[#8d9bb0]">· 6 min later</span>
                <div className="mt-1">The clip is exported and attached to this ticket. It stays available for 30 days.</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[12px] text-[#8d9bb0]">No tickets yet.</div>
        )}
      </Card>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {["Colocation agreement", "Site licence", "Monthly SLA report"].map((d, i) => (
          <Card key={d} className="pf-rise flex items-center gap-3 px-4 py-3" style={{ animationDelay: `${200 + i * 70}ms` }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8d9bb0" strokeWidth="1.6" aria-hidden="true">
              <path d={ICONS[4]} strokeLinejoin="round" />
            </svg>
            <div>
              <div className="text-[12px] font-medium text-white">{d}</div>
              <div className="text-[10.5px] text-[#8d9bb0]">PDF</div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function Users() {
  const users = [
    ["Operations lead", "ops.lead@operator.example", "Customer admin", "Everything the company has", "Active"],
    ["RF engineer", "rf.engineer@operator.example", "Engineer", "Bakkish, Vavatsinia: Status & SLA, Visits, CCTV, Tickets", "Active"],
    ["Field contractor", "field@contractor.example", "Security", "Vavatsinia: Status, CCTV, Visits", "Invited"],
  ];
  return (
    <>
      <Title t="Users & permissions" s="Add people from your company and choose, per teleport, what each person sees." right={<Btn primary>Add user</Btn>} />
      <Card className="p-5">
        <div className="mb-2 text-[14px] font-semibold text-white">3 users</div>
        <div className="grid grid-cols-[1.3fr_.8fr_1.7fr_.5fr] border-b border-white/[0.08] pb-2 text-[11px] font-medium text-[#8d9bb0]">
          <span>Name</span>
          <span>Role</span>
          <span>Can see</span>
          <span>Status</span>
        </div>
        {users.map(([n, e, r, c, s], i) => (
          <div key={n} data-target={`user-${i}`} className="pf-rise grid grid-cols-[1.3fr_.8fr_1.7fr_.5fr] items-center border-b border-white/[0.06] py-2.5 text-[12px]" style={{ animationDelay: `${i * 90}ms` }}>
            <span>
              <span className="block font-semibold text-white">{n}</span>
              <span className="block text-[11px] text-[#8d9bb0]">{e}</span>
            </span>
            <span className="text-[#c9d2de]">{r}</span>
            <span className="pr-3 text-[11.5px] text-[#c9d2de]">{c}</span>
            <span>
              <Chip tone={s === "Active" ? "green" : "blue"} delay={300 + i * 100}>
                {s}
              </Chip>
            </span>
          </div>
        ))}
      </Card>
      <Card className="mt-3 px-5 py-3.5">
        <div className="mb-1.5 text-[13px] font-semibold text-white">Roles</div>
        {[
          ["Customer admin", "Everything the company has, plus adding and managing users"],
          ["Engineer", "Site status, visit requests, documents and tickets"],
          ["Viewer", "Read-only site status"],
        ].map(([r, d], i) => (
          <div key={r} className="pf-rise grid grid-cols-[150px_1fr] py-1 text-[11.5px]" style={{ animationDelay: `${350 + i * 70}ms` }}>
            <b className="text-white">{r}</b>
            <span className="text-[#aab4c2]">{d}</span>
          </div>
        ))}
      </Card>
    </>
  );
}

/* -------------------------------------------------------------------- film */
export default function PortalFilm() {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: W, h: H });
  const [t, setT] = useState(0);
  const [paused, setPaused] = useState(false);
  const [focusX, setFocusX] = useState(520); // where the phone view pans to
  const onScreen = useRef(false);
  const pointer = useRef<HTMLDivElement>(null);
  const arrow = useRef<SVGSVGElement>(null);
  const tap = useRef<HTMLSpanElement>(null);
  const pos = useRef({ x: 520, y: 330 });

  // The stage is laid out at 960×600 and zoomed to the frame it is given. `zoom` (not a
  // transform) makes the browser lay the text out again at the final size, so it is as
  // sharp as any other text on the page. On a phone the frame is taller than 16:10: the
  // stage then fills its height and the view pans sideways to follow the cursor.
  useEffect(() => {
    const el = host.current!;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => (onScreen.current = e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  // the clock: runs only while the film is on screen and not paused
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => onScreen.current && setT((v) => v + 100), 100);
    return () => window.clearInterval(id);
  }, [paused]);

  const scene = Math.floor(t / SCENE_MS) % NAV.length;
  const local = t % SCENE_MS;
  const cueIndex = SCRIPT[scene].reduce((last, c, i) => (c.at <= local ? i : last), -1);

  // The cursor. Each cue is one reach: along a shallow arc (hands do not move in straight
  // lines), on a minimum-jerk speed curve, to a point a little off the target's centre.
  // It is moved by writing its transform directly, outside React's render loop.
  useEffect(() => {
    const cue = SCRIPT[scene][cueIndex];
    const st = stage.current;
    const el = cue && st?.querySelector<HTMLElement>(`[data-target="${cue.target}"]`);
    const dot = pointer.current;
    if (!cue || !st || !el || !dot) return;
    const a = st.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const k = a.width / W || 1;
    const jitter = ((scene * 7 + cueIndex * 13) % 9) / 9 - 0.5; // same every loop, different per target
    const to = {
      x: (b.left - a.left + b.width * (0.5 + jitter * 0.22)) / k,
      y: (b.top - a.top + Math.min(b.height * (0.55 + jitter * 0.2), 44)) / k,
    };
    const from = { ...pos.current };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const bend = len * 0.16 * (cueIndex % 2 ? -1 : 1);
    const mid = { x: from.x + dx / 2 + (-dy / len) * bend, y: from.y + dy / 2 + (dx / len) * bend };
    setFocusX(to.x);

    let raf = 0;
    let timer = 0;
    const t0 = performance.now();
    const press = () => {
      // the click: the pointer dips, the thing under it is pressed, a soft ring fades out
      arrow.current?.animate([{ transform: "scale(1)" }, { transform: "scale(.82)", offset: 0.35 }, { transform: "scale(1)" }], { duration: 300, easing: "cubic-bezier(.23,1,.32,1)" });
      tap.current?.animate([{ transform: "scale(.3)", opacity: 0.4 }, { transform: "scale(1)", opacity: 0 }], { duration: 420, easing: "cubic-bezier(.23,1,.32,1)" });
      el.setAttribute("data-pressed", "");
      window.setTimeout(() => el.removeAttribute("data-pressed"), 170);
    };
    const frame = (now: number) => {
      const p = Math.min(1, (now - t0) / cue.dur);
      const e = reach(p);
      const x = (1 - e) * (1 - e) * from.x + 2 * (1 - e) * e * mid.x + e * e * to.x;
      const y = (1 - e) * (1 - e) * from.y + 2 * (1 - e) * e * mid.y + e * e * to.y;
      pos.current = { x, y };
      dot.style.transform = `translate(${x}px, ${y}px)`;
      if (p < 1) raf = requestAnimationFrame(frame);
      else if (cue.click) timer = window.setTimeout(press, CLICK_LAG);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [scene, cueIndex]);

  const scale = Math.max(box.w / W, box.h / H);
  const panX = Math.round(Math.min(0, Math.max(box.w - W * scale, box.w / 2 - focusX * scale)));

  const screens = [
    <Overview key={0} local={local} clock={t} />,
    <SiteStatus key={1} local={local} />,
    <Visits key={2} local={local} />,
    <Cctv key={3} local={local} clock={t} />,
    <Tickets key={4} local={local} />,
    <Users key={5} />,
  ];

  return (
    <figure>
      <div
        ref={host}
        role="img"
        aria-label={`Animated walkthrough of the LiveTelco client portal. ${CAPTIONS.join(" ")}`}
        className="relative aspect-[9/10] overflow-hidden rounded-2xl sm:aspect-[16/10] border border-white/10 bg-[#0f141b] shadow-[0_50px_100px_-40px_rgba(5,9,15,.7)]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none transition-transform duration-[850ms] ease-[cubic-bezier(.77,0,.175,1)]"
          style={panX ? { transform: `translateX(${panX}px)` } : undefined}
        >
        <div ref={stage} className="pf-stage absolute left-0 top-0 flex text-[#c9d2de]" style={{ width: W, height: H, zoom: scale }}>
          {/* sidebar */}
          <div className="flex w-[200px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0c1118] p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" width={617} height={160} className="ml-1 mt-1 h-[30px] w-auto self-start" />
            <div className="mt-4 rounded-lg bg-white/[0.04] px-3 py-2.5">
              <div className="text-[9.5px] font-medium uppercase tracking-[0.1em] text-[#8d9bb0]">Customer account</div>
              <div className="text-[13px] font-semibold text-white">Sample operator</div>
              <div className="text-[10.5px] text-[#8d9bb0]">2 teleports visible to you</div>
            </div>
            <div className="mt-3 space-y-0.5">
              {NAV.map((n, i) => (
                <div
                  key={n}
                  data-target={`nav-${i}`}
                  className={`flex h-[38px] items-center gap-2.5 rounded-lg px-3 text-[12.5px] font-medium transition-colors duration-200 ${i === scene ? "bg-white/[0.08] text-white" : "text-[#c9d2de]"}`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={i === scene ? "#3fc5ff" : "currentColor"} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
                    <path d={ICONS[i]} />
                  </svg>
                  {n}
                </div>
              ))}
            </div>
            <div className="mt-auto border-t border-white/[0.08] px-1 pt-3 text-[10.5px] text-[#8d9bb0]">
              <div className="font-semibold text-white">NOC — 24/7</div>
              noc@livetelco.com
            </div>
          </div>

          {/* the current screen */}
          <div key={scene} className="pf-screen min-w-0 flex-1 px-6 py-5">
            {screens[scene]}
          </div>

          {/* the cursor: a standard arrow pointer; its tip is the element's origin */}
          <div ref={pointer} className="absolute left-0 top-0 z-20 will-change-transform" style={{ transform: "translate(520px, 330px)" }}>
            <span ref={tap} className="absolute -left-4 -top-4 h-8 w-8 rounded-full bg-white opacity-0" />
            <svg ref={arrow} width="22" height="22" viewBox="0 0 24 24" className="relative -left-[4px] -top-[2px] origin-[4px_2px] drop-shadow-[0_1px_2px_rgba(0,0,0,.55)]">
              <path d="M4 2.5v17l4.6-4.1 3 6.6 2.8-1.2-2.9-6.5h6.3z" fill="#111827" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        </div>

        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Play the portal walkthrough" : "Pause the portal walkthrough"}
          className="absolute bottom-3 right-3 z-30 grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-[#05090f]/70 text-white backdrop-blur transition-colors hover:border-white/60"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d={paused ? "M8 5.5v13l11-6.5z" : "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"} />
          </svg>
        </button>
      </div>

      {/* chapters: which screen is playing, and how far along */}
      <figcaption className="mt-5">
        <div className="flex gap-1.5" aria-hidden="true">
          {NAV.map((n, i) => (
            <span key={n} className="h-[3px] flex-1 overflow-hidden rounded-full bg-line">
              <span
                className="block h-full origin-left bg-accent"
                style={{ transform: `scaleX(${i < scene ? 1 : i === scene ? local / SCENE_MS : 0})`, transition: i === scene ? "transform .1s linear" : "none" }}
              />
            </span>
          ))}
        </div>
        <p className="mt-3 flex flex-wrap items-baseline gap-x-3 text-sm">
          <span className="font-semibold text-heading">{NAV[scene]}</span>
          <span key={scene} className="pf-fade text-muted">
            {CAPTIONS[scene]}
          </span>
        </p>
        <p className="mt-1 text-xs text-muted">Sample account. The film shows the real portal screens with sample data.</p>
      </figcaption>
    </figure>
  );
}
