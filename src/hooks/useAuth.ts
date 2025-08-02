import { useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  created_at: string;
  display_name?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    console.log('🔧 useAuth: Initialisation du hook');

    // Mode développement forcé - utilisateur statique
    console.warn('🔧 Mode développement forcé - utilisateur statique');
    
    // Nettoyer complètement localStorage en toute sécurité
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        console.log('🧹 Nettoyage localStorage...');
        // Supprimer toutes les clés Supabase
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('sb-')) {
            try {
              localStorage.removeItem(key);
              console.log('🗑️ Supprimé:', key);
            } catch (e) {
              console.warn('Impossible de supprimer:', key);
            }
          }
        });
      }
    } catch (error) {
      console.warn('⚠️ Problème localStorage:', error);
    }
    
    // Forcer un utilisateur de développement (sans localStorage)
    if (mounted) {
      console.log('👤 Création utilisateur de développement...');
      const devUser = {
        id: 'dev-user-123',
        email: 'anto.dlebos@gmail.com',
        created_at: new Date().toISOString(),
        display_name: 'Antoine Delebos'
      };
      
      setUser(devUser);
      setLoading(false);
      console.log('✅ Utilisateur créé:', devUser);
    }
    
    return () => { mounted = false; };
  }, []);

  // Écouter les événements de mise à jour du profil
  useEffect(() => {
    if (!user) return;

    const handleProfileUpdate = async (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent?.detail?.display_name) {
        setUser(prevUser => prevUser ? {
          ...prevUser,
          display_name: customEvent.detail.display_name
        } : null);
      }
    };

    // Écouter les événements de connexion depuis /auth
    const handleUserLogin = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent?.detail) {
        console.log('🔄 Événement de connexion reçu:', customEvent.detail);
        setUser({
          id: customEvent.detail.id,
          email: customEvent.detail.email,
          created_at: customEvent.detail.created_at,
          display_name: customEvent.detail.display_name || ''
        });
        setLoading(false);
      }
    };
    
    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    window.addEventListener('userLoggedIn', handleUserLogin);

    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
      window.removeEventListener('userLoggedIn', handleUserLogin);
    };
  }, [user]);

  const signOut = async () => {
    console.log('🚪 Déconnexion en cours...');
    
    // Effacer les données locales
    setUser(null);
    
    if (typeof window !== 'undefined') {
      // Nettoyer toutes les données liées à l'authentification
      try {
        localStorage.removeItem('saave_user_profile');
        
        // Nettoyer les sessions Supabase
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('sb-')) {
            console.log('🧹 Suppression:', key);
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('⚠️ Erreur nettoyage localStorage:', error);
      }
    }
    
    console.log('✅ Déconnexion terminée, redirection vers /auth');
    // Rediriger vers la page d'authentification
    window.location.href = '/auth';
  };

  return { user, loading, signOut };
}