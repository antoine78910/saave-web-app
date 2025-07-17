import Hero from "../components/Hero";
import Features from "../components/Features";
import OrganizationSection from "../components/OrganizationSection";
import Pricing from "../components/Pricing";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";

const Index = () => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "hsl(var(--background))" }}>
      <Navbar />
      <Hero />
      <Features />
      <OrganizationSection />
      <Pricing />
      <Footer />
    </div>
  );
};

export default Index;
