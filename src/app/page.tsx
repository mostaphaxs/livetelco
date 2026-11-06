import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import Film from "@/components/Film";
import Challenge from "@/components/Challenge";
import Services from "@/components/Services";
import Compliance from "@/components/Compliance";
import Network from "@/components/Network";
import Portal from "@/components/Portal";
import Closing from "@/components/Closing";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Stats />
        <Film />
        <Challenge />
        <Services />
        <Compliance />
        <Network />
        <Portal />
        <Closing />
      </main>
    </>
  );
}
