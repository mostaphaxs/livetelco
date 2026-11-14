"use client";

import PortalFilm from "./PortalFilm";
import Signal from "./Signal";
import { useInView } from "@/lib/motion";
import { fade, power, q, signal, timeline } from "@/lib/reveal";

export default function Portal() {
  // the signal crosses, the words arrive, then the film's screen switches on
  const ref = useInView<HTMLElement>((el) => {
    const tl = timeline();
    signal(tl, el, 0);
    fade(tl, q(el, '[data-anim="fade"]'), 250, 70);
    power(tl, q(el, '[data-anim="power"]'), 500);
    return () => tl.revert();
  });

  return (
    <section ref={ref} id="portal" className="relative sec" data-bg-from="navy">
      <Signal />
      <div className="container-x">
        <div className="grid items-end gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p data-anim="fade" className="eyebrow">
              Client portal
            </p>
            <h2 data-anim="fade" className="h-section mt-4">
              Every teleport, followed live.
            </h2>
          </div>
          <div className="lg:justify-self-end">
            <p data-anim="fade" className="lead max-w-md">
              Power, network, cameras, visits and tickets for each of your sites, with two-step sign-in and access
              managed by your own admin.
            </p>
            <a href="https://livetelco.com/portal/" data-anim="fade" className="btn btn-primary mt-6">
              Sign in to the portal
            </a>
          </div>
        </div>

        {/* the portal itself, as a short film that plays on its own */}
        <div data-anim="power" className="mx-auto mt-12 max-w-[1200px]">
          <PortalFilm />
        </div>
      </div>
    </section>
  );
}
