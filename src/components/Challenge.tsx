"use client";

// Building your own gateway vs. colocating at a LiveTelco teleport.
const ROWS: { topic: string; diy: string; lt: string }[] = [
  {
    topic: "Land",
    diy: "Search, negotiate and buy in each country",
    lt: "Owned or on long-term lease by LiveTelco",
  },
  {
    topic: "Licences & zoning",
    diy: "Local permits, RF studies, aviation and environment approvals",
    lt: "Already in place for every site",
  },
  {
    topic: "Power",
    diy: "Grid connection and backup to design and build",
    lt: "500 kVA+ with a 99.5% SLA",
  },
  {
    topic: "Connectivity",
    diy: "Negotiate fibre routes with local carriers",
    lt: "100G+ fibre, Tier 1 redundancy, carrier-neutral",
  },
  {
    topic: "Security & operations",
    diy: "Hire guards, install CCTV, staff a local team",
    lt: "Fence, CCTV, 24/7 NOC and on-site teams included",
  },
  { topic: "Time to first link", diy: "18–24 months", lt: "Weeks" },
];

const X = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className="mt-0.5 shrink-0 text-[#9aa6b6]"
  >
    <path
      d="M7 7l10 10M17 7L7 17"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);
const CHECK = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className="mt-0.5 shrink-0 text-accent"
  >
    <path
      d="M5 12.5l4.5 4.5L19 7.5"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function Challenge() {
  return (
    <section className="sec">
      <div className="container-x">
        <div className="max-w-2xl">
          <p className="eyebrow">The challenge</p>
          <h2 className="h-section mt-4">
            Building a ground station takes years. Ours are ready now.
          </h2>
          <p className="lead mt-5">
            Every new country is a legal, technical and political project before
            the first link. We have already done that work, site by site.
          </p>
        </div>

        <div className="card mt-14 overflow-hidden">
          {/* header */}
          <div className="grid grid-cols-[1fr] border-b border-line md:grid-cols-[0.8fr_1fr_1fr]">
            <div className="hidden px-6 py-5 md:block" />
            <div className="hidden px-6 py-5 text-sm font-semibold text-muted md:block">
              Building your own gateway
            </div>
            <div className="relative bg-accent/[0.06] px-6 py-5 text-sm font-semibold text-heading md:border-l md:border-accent/25">
              <span className="absolute inset-x-0 top-0 h-0.5 bg-accent" />
              With LiveTelco
            </div>
          </div>
          {ROWS.map((r, i) => (
            <div
              key={r.topic}
              className={`grid md:grid-cols-[0.8fr_1fr_1fr] ${i < ROWS.length - 1 ? "border-b border-line" : ""}`}
            >
              <div className="px-6 pt-5 font-display font-semibold text-heading md:py-5">
                {r.topic}
              </div>
              <div className="flex gap-2.5 px-6 py-2 text-sm text-muted md:py-5">
                {X}
                <span>
                  <span className="font-medium md:hidden">Own build: </span>
                  {r.diy}
                </span>
              </div>
              <div
                className={`flex gap-2.5 bg-accent/[0.06] px-6 pb-5 pt-2 text-sm md:border-l md:border-accent/25 md:py-5 ${i === ROWS.length - 1 ? "font-semibold text-heading" : "text-ink"}`}
              >
                {CHECK}
                <span>{r.lt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
