"use client";

import Hero from "../components/Hero";
import Features from "../components/Features";
import OrganizationSection from "../components/OrganizationSection";
import Pricing from "../components/Pricing";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useEffect } from "react";
import { supabase } from "../lib/supabase-client";
import { useRouter } from "next/navigation";
import { useAuth } from "../src/hooks/useAuth";

const Index = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Handle hash-based tokens if we land on /
    if (typeof window !== 'undefined') {
      const hash = window.location.hash?.replace(/^#/, '');
      if (hash) {
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          supabase.auth.setSession({ access_token, refresh_token }).then(() => {
            try { window.history.replaceState({}, '', '/'); } catch {}
            const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
            router.replace(`${base.endsWith('/app') ? base : base + '/app'}`);
          });
        }
      }
    }
  }, [router]);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/app");
    }
  }, [loading, user, router]);

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
