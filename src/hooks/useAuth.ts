import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

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
    console.log('🔧 useAuth: Initialisation du hook avec Supabase');

    // Vérifier la session existante
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        if (session?.user) {
          const userData: User = {
            id: session.user.id,
            email: session.user.email || '',
            created_at: session.user.created_at || '',
            display_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || ''
          };
          setUser(userData);
          console.log('✅ Session existante trouvée:', userData);
        } else {
          setUser(null);
          console.log('❌ Aucune session trouvée');
        }
        setLoading(false);
      }
    });

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user?.email);
        
        if (mounted) {
          if (session?.user) {
            const userData: User = {
              id: session.user.id,
              email: session.user.email || '',
              created_at: session.user.created_at || '',
              display_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || ''
            };
            setUser(userData);
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Rediriger vers /auth si pas connecté
  useEffect(() => {
    if (!loading && !user && typeof window !== 'undefined') {
      console.log('🔄 Redirection vers /auth car pas d\'utilisateur connecté');
      window.location.href = '/auth';
    }
  }, [user, loading]);

  // Écouter les événements de mise à jour du profil (optionnel)
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

    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
    };
  }, [user]);

  const signOut = async () => {
    console.log('🚪 Déconnexion en cours...');
    
    try {
      // Déconnexion Supabase
      await supabase.auth.signOut();
      
      // Nettoyage localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('saave_user_profile');
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('sb-')) {
              localStorage.removeItem(key);
            }
          });
        } catch (error) {
          console.warn('⚠️ Erreur nettoyage localStorage:', error);
        }
      }
      
      // La redirection sera gérée automatiquement par onAuthStateChange
      console.log('✅ Déconnexion réussie');
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
      // En cas d'erreur, forcer la redirection quand même
      window.location.href = '/auth';
    }
  };

  return { user, loading, signOut };
}