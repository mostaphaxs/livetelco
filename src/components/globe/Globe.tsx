"use client";

import dynamic from "next/dynamic";
import type { GlobeProps } from "./GlobeCanvas";

// three.js stays out of the server bundle and the critical path.
const GlobeCanvas = dynamic(() => import("./GlobeCanvas"), { ssr: false, loading: () => null });

export default function Globe(props: GlobeProps) {
  return <GlobeCanvas {...props} />;
}
