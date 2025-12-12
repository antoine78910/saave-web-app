"use client";

import Hero from "../components/Hero";
import Features from "../components/Features";
import OrganizationSection from "../components/OrganizationSection";
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
    // Redirection automatique : si on est sur app.localhost, rediriger vers /app
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const pathname = window.location.pathname;
      
      // Si on est sur app.localhost et qu'on est à la racine, rediriger vers /app
      if ((hostname === 'app.localhost' || hostname.startsWith('app.')) && pathname === '/') {
        console.log('Redirecting app.localhost root to /app');
        router.replace('/app');
        return;
      }
      
      // Handle hash-based tokens if we land on /
      const hash = window.location.hash?.replace(/^#/, '');
      if (hash) {
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          supabase.auth.setSession({ access_token, refresh_token }).then(() => {
            try { window.history.replaceState({}, '', '/'); } catch {}
            router.replace('/app');
          });
        }
      }
    }
  }, [router]);

  // Redirection supprimée : l'utilisateur peut maintenant accéder à la page d'accueil même s'il est connecté

  return (
    <div className="min-h-screen" style={{ backgroundColor: "hsl(var(--background))" }}>
      <Navbar />
      <Hero />
      <Features />
      {/* OrganizationSection removed per request */}
      <Footer />
    </div>
  );
};

export default Index;
