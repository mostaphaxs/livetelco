/*
  Line drawings for the service cards, in the film's style: thin cyan strokes on the
  night background, with the ground and survey lines in a fainter white.
  Every shape is a stroke (path / circle) so `trace` (lib/reveal.ts) can draw it in.
  viewBox 200×100, ground line at y=84.
*/
import type { ReactNode } from "react";

const P = ({ d }: { d: string }) => <path d={d} data-line="main" />;
const S = ({ d }: { d: string }) => <path d={d} data-line="soft" />;

function Art({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 200 100"
      role="img"
      aria-label={label}
      data-anim="trace"
      className="h-full w-full [&_[data-line=main]]:stroke-[#07b6ff] [&_[data-line=soft]]:stroke-white/25"
      fill="none"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** anti-climb fence with an electronic gate, watched by a CCTV camera */
export const SecurityArt = () => (
  <Art label="Anti-climb fence and gate watched by a CCTV camera">
    <S d="M10 84H190" />
    <S d="M145 34L118 62M145 31L110 46" />
    <P d="M24 84V46l5-6M44 84V46l5-6M64 84V46l5-6M84 84V46l5-6M104 84V40l5-6" />
    <P d="M24 52H104M24 78H104" />
    <P d="M24 78L44 52M44 78L24 52M44 78L64 52M64 78L44 52M64 78L84 52M84 78L64 52M84 78L104 52M104 78L84 52" />
    <P d="M136 84V40l-5-6M106 50H134V82H106ZM120 50V82M106 82L120 50M134 82L120 50" />
    <P d="M176 84V30M176 32H166M150 26h16v10h-16ZM150 31h-5" />
    <circle cx="160" cy="31" r="1.4" data-line="main" />
  </Art>
);

/** an operator's dish on its pad, the maintenance ladder beside it */
export const TechnicalArt = () => (
  <Art label="Satellite dish on a prepared pad, with a maintenance ladder">
    <S d="M10 84H190" />
    <S d="M66 84l10-6h48l10 6" />
    <P d="M100 78V56M92 78h16" />
    <P d="M70 54Q96 76 128 40M70 54L128 40" />
    <P d="M80 52L104 26M120 42L104 26M101 22h6v6h-6Z" />
    <P d="M112 18a10 10 0 0 1 10 10M116 10a18 18 0 0 1 18 18M120 2a26 26 0 0 1 26 26" />
    <S d="M146 84l10-40M158 84l10-40M148 76h12M150 68h12M152 60h12M154 52h12" />
  </Art>
);

/** a plot surveyed and marked: stakes at the corners, the pin on the chosen land */
export const AcquisitionArt = () => (
  <Art label="A surveyed plot of land with a location pin">
    <S d="M10 84H190" />
    <S d="M65 53L135 79M135 53L65 79" />
    <P d="M30 66L100 40L170 66L100 92Z" />
    <S d="M30 66V58M100 40V32M170 66V58M100 92V84" />
    <S d="M94 66a6 2.2 0 1 0 12 0a6 2.2 0 1 0-12 0" />
    <P d="M100 64C93 54 89 48 89 41a11 11 0 0 1 22 0c0 7-4 13-11 23Z" />
    <circle cx="100" cy="41" r="4" data-line="main" />
  </Art>
);

/** shelter and generator, with fibre running out to the carriers and grid power in */
export const ConnectivityArt = () => (
  <Art label="Shelter and generator, with fibre running out to several carriers">
    <S d="M10 84H190" />
    <S d="M16 84V40M10 46h12M16 44Q24 52 30 58" />
    <P d="M30 56H74V84H30ZM30 56L44 46H88L74 56M74 84L88 74V46M44 84V66H56V84" />
    <P d="M92 72H112V84H92ZM108 72V64" />
    <P d="M88 60C120 60 130 44 190 44M88 66C124 66 136 58 190 58M112 78C140 78 150 72 190 72" />
  </Art>
);
