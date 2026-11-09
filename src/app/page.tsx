import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import FilmModal from "@/components/FilmModal";
import Challenge from "@/components/Challenge";
import Services from "@/components/Services";
import HowItWorks from "@/components/HowItWorks";
import Compliance from "@/components/Compliance";
import Network from "@/components/Network";
import Portal from "@/components/Portal";
import Closing from "@/components/Closing";

export default function Home() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Nav />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <Challenge />
        <Services />
        <HowItWorks />
        <Compliance />
        <Network />
        <Portal />
        <Closing />
      </main>
      <FilmModal />
    </>
  );
}
