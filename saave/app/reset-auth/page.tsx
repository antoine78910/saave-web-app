"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAppUrl } from '../../lib/urls';

export default function ResetAuthPage() {
  const router = useRouter();

  useEffect(() => {
    // Nettoyer complètement le localStorage
    if (typeof window !== 'undefined') {
      console.log('🧹 Nettoyage complet du localStorage...');
      
      // Lister toutes les clés
      const keys = Object.keys(localStorage);
      console.log('📋 Clés existantes:', keys);
      
      // Supprimer toutes les clés liées à l'authentification
      keys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('auth') || key.includes('saave')) {
          console.log('🗑️ Suppression:', key);
          localStorage.removeItem(key);
        }
      });
      
      // Créer un utilisateur de développement propre
      const cleanUser = {
        id: 'dev-user-123',
        email: 'anto.dlebos@gmail.com',
        display_name: 'Antoine Delebos',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      localStorage.setItem('saave_user_profile', JSON.stringify(cleanUser));
      console.log('✅ Utilisateur de développement créé:', cleanUser);
      
      // Rediriger vers /app après 2 secondes
      setTimeout(() => {
        console.log('🔄 Redirection vers /app...');
        window.location.href = getAppUrl('/');
      }, 2000);
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#181a1b] text-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-6xl">🧹</div>
        <h1 className="text-2xl font-bold">Nettoyage de l'authentification...</h1>
        <p className="text-gray-400">Redirection automatique vers l'app...</p>
        <div className="mt-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
        </div>
      </div>
    </div>
  );
}