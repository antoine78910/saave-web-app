"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../../src/hooks/useAuth';
import { createClient } from '@supabase/supabase-js';

export default function AccountPage() {
  const { user, loading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [forceShow, setForceShow] = useState(false);

  // Utilisateur par défaut pour le mode développement
  const currentUser = user || {
    id: 'dev-user-123',
    email: 'anto.delbos@gmail.com',
    created_at: new Date().toISOString(),
    display_name: 'Antoine'
  };

  // Timeout de sécurité pour éviter le chargement infini
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('Forcing show after 3 seconds timeout');
      setForceShow(true);
      
      // Initialiser avec des données par défaut si pas encore fait
      if (!email && !displayName) {
        setEmail('anto.delbos@gmail.com');
        setDisplayName('Antoine');
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [email, displayName]);

  // Initialiser les champs avec les données utilisateur
  useEffect(() => {
    if (user) {
      setEmail(user.email);
      // Récupérer le nom d'affichage depuis le profil utilisateur
      fetchUserProfile();
    } else {
      // Charger depuis localStorage si pas d'utilisateur
      loadLocalProfile();
    }
  }, [user]);

  const loadLocalProfile = () => {
    try {
      const saved = localStorage.getItem('saave_user_profile');
      if (saved) {
        const profile = JSON.parse(saved);
        setDisplayName(profile.display_name || '');
        setEmail(profile.email || '');
      }
    } catch (error) {
      console.warn('Could not load local profile:', error);
    }
  };

  const fetchUserProfile = async () => {
    if (!currentUser) return;

    // Si Supabase n'est pas configuré, utiliser les données utilisateur directement
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setDisplayName(currentUser.display_name || '');
      return;
    }

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', currentUser.id)
        .single();

      if (data) {
        setDisplayName(data.display_name || '');
      } else if (error && error.code === 'PGRST116') {
        // Profil n'existe pas, créer un profil vide
        await supabase
          .from('profiles')
          .insert([{ id: currentUser.id, display_name: '' }]);
      }
    } catch (error) {
      console.warn('Could not fetch user profile:', error);
      setDisplayName(currentUser.display_name || '');
    }
  };

  const updateDisplayName = async () => {
    if (!currentUser) {
      console.error('No current user');
      return;
    }

    console.log('🔄 Début de la sauvegarde...', { displayName, currentUser });
    setSaving(true);

    try {
      // TOUJOURS sauvegarder localement pour que ça marche immédiatement
      const userProfile = {
        id: currentUser.id,
        email: currentUser.email,
        display_name: displayName,
        updated_at: new Date().toISOString()
      };
      
      localStorage.setItem('saave_user_profile', JSON.stringify(userProfile));
      console.log('💾 Profil sauvegardé dans localStorage:', userProfile);
      
      // Réinitialiser les états
      setSaving(false);
      setIsEditingName(false);
      setMessage('✅ Nom sauvegardé avec succès !');
      
      // Mettre à jour le user dans useAuth
      window.dispatchEvent(new CustomEvent('userProfileUpdated', {
        detail: { display_name: displayName }
      }));
      
      console.log('✅ Sauvegarde terminée avec succès');
      
      // Effacer le message après 3 secondes
      setTimeout(() => setMessage(''), 3000);
      
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      setSaving(false);
      setIsEditingName(false);
      setMessage('❌ Erreur lors de la sauvegarde');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const updateEmail = async () => {
    if (!currentUser) {
      console.error('No current user for email update');
      return;
    }

    console.log('🔄 Début de la sauvegarde email...', { email, currentUser });
    setSaving(true);

    try {
      // TOUJOURS sauvegarder localement
      const userProfile = {
        id: currentUser.id,
        email: email,
        display_name: displayName,
        updated_at: new Date().toISOString()
      };
      
      localStorage.setItem('saave_user_profile', JSON.stringify(userProfile));
      console.log('💾 Email sauvegardé dans localStorage:', userProfile);
      
      // Réinitialiser les états
      setSaving(false);
      setIsEditingEmail(false);
      setMessage('✅ Email sauvegardé avec succès !');
      
      console.log('✅ Sauvegarde email terminée avec succès');
      
      setTimeout(() => setMessage(''), 3000);
      
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde email:', error);
      setSaving(false);
      setIsEditingEmail(false);
      setMessage('❌ Erreur lors de la sauvegarde');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading && !forceShow) {
    return (
      <div className="min-h-screen bg-[#181a1b] text-white flex items-center justify-center">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  // currentUser est maintenant défini en haut de la fonction

  if (!user && !forceShow) {
    return (
      <div className="min-h-screen bg-[#181a1b] text-white flex items-center justify-center">
        <div className="text-lg">Veuillez vous connecter</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#181a1b] text-white flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl bg-[#232526] rounded-2xl shadow-lg p-8 flex flex-col gap-8 border border-gray-700">
        <h1 className="text-4xl font-bold mb-4">
          Hello {displayName || currentUser.display_name || 'utilisateur'} <span className="inline-block">👋</span>
        </h1>

        {message && (
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-3 text-green-300">
            {message}
          </div>
        )}

        {/* Section Nom d'affichage */}
        <div className="bg-[#232526] rounded-xl border border-gray-700 p-6 mb-2">
          <div className="font-semibold mb-2">Nom d'affichage</div>
          <div className="text-gray-400 mb-2 text-sm">Nom affiché dans l'application.</div>
          <div className="flex gap-2 items-center">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="flex-1 bg-[#181a1b] border border-gray-700 rounded-lg px-4 py-2 text-white"
              disabled={!isEditingName}
              placeholder="Entrez votre nom"
            />
            {isEditingName ? (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    console.log('🖱️ Bouton cliqué, état saving:', saving);
                    if (!saving) {
                      updateDisplayName();
                    }
                  }}
                  disabled={saving}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingName(false);
                    fetchUserProfile(); // Reset aux valeurs originales
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-accent/90"
              >
                Modifier
              </button>
            )}
          </div>
        </div>

        {/* Section Email */}
        <div className="bg-[#232526] rounded-xl border border-gray-700 p-6 mb-2">
          <div className="font-semibold mb-2">Email</div>
          <div className="text-gray-400 mb-2 text-sm">Modifiez votre adresse email.</div>
          <div className="flex gap-2 items-center">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-[#181a1b] border border-gray-700 rounded-lg px-4 py-2 text-white"
              disabled={!isEditingEmail}
              type="email"
            />
            {isEditingEmail ? (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    console.log('🖱️ Bouton email cliqué, état saving:', saving);
                    if (!saving) {
                      updateEmail();
                    }
                  }}
                  disabled={saving}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingEmail(false);
                    setEmail(currentUser.email); // Reset à la valeur originale
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingEmail(true)}
                className="bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-accent/90"
              >
                Modifier
              </button>
            )}
          </div>
        </div>

        {/* Section Danger */}
        <div className="bg-[#2a2324] rounded-xl border border-red-900 p-6">
          <div className="font-semibold text-red-400 mb-2">Zone dangereuse</div>
          <div className="text-gray-400 mb-2 text-sm">
            Supprimer votre compte. Après avoir cliqué sur le bouton, vous devrez confirmer la suppression via un lien envoyé à votre email.
          </div>
          <button className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 float-right">
            Supprimer le compte
          </button>
        </div>
      </div>
    </div>
  );
}
