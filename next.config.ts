import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      // Autoriser les favicons de Google
      'www.google.com',
      // Autres domaines couramment utilisés pour les favicons et thumbnails
      's2.googleusercontent.com',
      'favicon.ico',
      't0.gstatic.com',
      't1.gstatic.com',
      't2.gstatic.com',
      't3.gstatic.com',
      'i.imgur.com',
      'icons.duckduckgo.com',
      'api.faviconkit.com',
      // Ajoutez d'autres domaines selon vos besoins
    ],
    // Configuration pour permettre des images non optimisées de sources externes
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '**',
      },
    ],
  },
};

export default nextConfig;
