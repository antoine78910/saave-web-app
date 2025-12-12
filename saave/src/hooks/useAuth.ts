import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase-client';
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
    // Ne rien faire côté serveur
    if (typeof window === 'undefined') {
      return;
    }

    let mounted = true;
    console.log('🔧 useAuth: Initialisation du hook avec Supabase');

    // Fonction pour traiter les données utilisateur
    const processUserData = (supabaseUser: any): User => ({
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      created_at: supabaseUser.created_at || '',
      display_name: supabaseUser.user_metadata?.full_name || 
                   supabaseUser.user_metadata?.name || 
                   supabaseUser.email?.split('@')[0] || ''
    });

    // Mettre à jour le display_name en récupérant le profil côté serveur
    const refreshDisplayName = async (userId: string) => {
      try {
        const res = await fetch(`/api/user/profile?user_id=${userId}`);
        if (!res.ok) return;
        const data = await res.json();
        const nextName = data?.display_name || '';
        if (nextName) {
          setUser(prev => prev ? { ...prev, display_name: nextName } : prev);
          try {
            // Stocker aussi localement pour l'extension/rafraîchissements
            const current = { id: userId, email: data?.email || '', display_name: nextName, updated_at: new Date().toISOString() };
            localStorage.setItem('saave_user_profile', JSON.stringify(current));
          } catch {}
        }
      } catch {}
    };

    // Vérifier la session existante
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erreur lors de la récupération de la session:', error);
          setUser(null);
          setLoading(false);
          return;
        }

        if (mounted) {
          if (session?.user) {
            const userData = processUserData(session.user);
            setUser(userData);
            console.log('✅ Session existante trouvée:', userData);
            // Rafraîchir le display_name depuis la table profiles
            try { await refreshDisplayName(userData.id); } catch {}
          } else {
            setUser(null);
            console.log('❌ Aucune session trouvée');
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Erreur dans checkSession:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    checkSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 useAuth: Auth state change!', {
          event,
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          mounted
        });
        
        if (mounted) {
          if (session?.user) {
            const userData = processUserData(session.user);
            console.log('✅ useAuth: Utilisateur connecté, mise à jour du state:', userData);
            setUser(userData);
            // Rafraîchir le display_name serveur
            try { refreshDisplayName(userData.id); } catch {}
          } else {
            console.log('❌ useAuth: Pas d\'utilisateur, reset du state');
            setUser(null);
          }
          setLoading(false);
        } else {
          console.log('⚠️ useAuth: Component démonté, ignore le changement d\'état');
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Ne pas rediriger automatiquement si non connecté.
  // Les pages protégées et le middleware gèrent la redirection.

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

  // Rafraîchir le display_name au retour sur l'onglet (focus/visibility) - DÉSACTIVÉ pour économiser les API calls
  // useEffect(() => {
  //   if (!user?.id) return;
  //   let cancelled = false;
  //   const refresh = async () => {
  //     try {
  //       const res = await fetch(`/api/user/profile?user_id=${user.id}`);
  //       if (!res.ok) return;
  //       const data = await res.json();
  //       if (cancelled) return;
  //       const nextName = data?.display_name || '';
  //       if (nextName) {
  //         setUser(prev => prev ? { ...prev, display_name: nextName } : prev);
  //       }
  //     } catch {}
  //   };

  //   const onFocus = () => { refresh(); };
  //   const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
  //   window.addEventListener('focus', onFocus);
  //   document.addEventListener('visibilitychange', onVisibility);
  //   // Déclenche un refresh immédiat (utile après navigation)
  //   refresh();
  //   return () => {
  //     cancelled = true;
  //     window.removeEventListener('focus', onFocus);
  //     document.removeEventListener('visibilitychange', onVisibility);
  //   };
  // }, [user?.id]);

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