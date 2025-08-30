"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../../src/hooks/useAuth';
import { createClient } from '@supabase/supabase-js';
import AppTopBar from '../../components/AppTopBar';

export default function AccountPage() {
  const { user, loading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [forceShow, setForceShow] = useState(false);

  // Default user for development mode
  const currentUser = user || {
    id: 'dev-user-123',
    email: 'anto.delbos@gmail.com',
    created_at: new Date().toISOString(),
    display_name: 'Antoine'
  };

  // Safety timeout to avoid infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('Forcing show after 3 seconds timeout');
      setForceShow(true);
      
      // Initialize with defaults if not set
      if (!email && !displayName) {
        setEmail('anto.delbos@gmail.com');
        setDisplayName('Antoine');
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [email, displayName]);

  // Initialize fields from user data
  useEffect(() => {
    if (user) {
      setEmail(user.email);
      // Fetch display name from profile
      fetchUserProfile();
    } else {
      // Load from localStorage if no user
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

    // If Supabase is not configured, use current user data
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
        // If profile does not exist, create an empty one
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

    console.log('🔄 Start saving...', { displayName, currentUser });
    setSaving(true);

    try {
      // Always save locally so it works immediately
      const userProfile = {
        id: currentUser.id,
        email: currentUser.email,
        display_name: displayName,
        updated_at: new Date().toISOString()
      };
      
      localStorage.setItem('saave_user_profile', JSON.stringify(userProfile));
      console.log('💾 Profile saved in localStorage:', userProfile);
      
      // Reset states
      setSaving(false);
      setIsEditingName(false);
      setMessage('✅ Name saved successfully!');
      
      // Update user in useAuth
      window.dispatchEvent(new CustomEvent('userProfileUpdated', {
        detail: { display_name: displayName }
      }));
      
      console.log('✅ Save finished successfully');
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
      
    } catch (error) {
      console.error('❌ Error while saving:', error);
      setSaving(false);
      setIsEditingName(false);
      setMessage('❌ Error while saving');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const updateEmail = async () => {
    if (!currentUser) {
      console.error('No current user for email update');
      return;
    }

    console.log('🔄 Start email save...', { email, currentUser });
    setSaving(true);

    try {
      // Always save locally
      const userProfile = {
        id: currentUser.id,
        email: email,
        display_name: displayName,
        updated_at: new Date().toISOString()
      };
      
      localStorage.setItem('saave_user_profile', JSON.stringify(userProfile));
      console.log('💾 Email saved in localStorage:', userProfile);
      
      // Reset states
      setSaving(false);
      setIsEditingEmail(false);
      setMessage('✅ Email saved successfully!');
      
      console.log('✅ Email save finished successfully');
      
      setTimeout(() => setMessage(''), 3000);
      
    } catch (error) {
      console.error('❌ Error while saving email:', error);
      setSaving(false);
      setIsEditingEmail(false);
      setMessage('❌ Error while saving');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading && !forceShow) {
    return (
      <div className="min-h-screen bg-[#181a1b] text-white flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // currentUser est maintenant défini en haut de la fonction

  if (!user && !forceShow) {
    return (
      <div className="min-h-screen bg-[#181a1b] text-white flex items-center justify-center">
        <div className="text-lg">Please sign in</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#181a1b] text-white flex flex-col">
      <AppTopBar />
      <div className="w-full max-w-2xl mx-auto bg-[#232526] rounded-2xl shadow-lg p-8 flex flex-col gap-8 border border-gray-700 mt-8">
        <h1 className="text-3xl font-bold mb-1">Account</h1>
        <p className="text-gray-400">Manage your profile information.</p>

        {message && (
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-3 text-green-300">
            {message}
          </div>
        )}

        {/* Display Name */}
        <div className="bg-[#232526] rounded-xl border border-gray-700 p-6 mb-2">
          <div className="font-semibold mb-2">Display name</div>
          <div className="text-gray-400 mb-2 text-sm">This name is shown in the application.</div>
          <div className="flex gap-2 items-center">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="flex-1 bg-[#181a1b] border border-gray-700 rounded-lg px-4 py-2 text-white"
              disabled={!isEditingName}
              placeholder="Enter your name"
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
                  className="bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingName(false);
                    fetchUserProfile(); // Reset to original values
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-accent/90"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="bg-[#232526] rounded-xl border border-gray-700 p-6 mb-2">
          <div className="font-semibold mb-2">Email</div>
          <div className="text-gray-400 mb-2 text-sm">Update your email address.</div>
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
                    console.log('🖱️ Email save clicked, saving:', saving);
                    if (!saving) {
                      updateEmail();
                    }
                  }}
                  disabled={saving}
                  className="bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingEmail(false);
                    setEmail(currentUser.email); // Reset to original value
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingEmail(true)}
                className="bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-accent/90"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-[#2a2324] rounded-xl border border-red-900 p-6">
          <div className="font-semibold text-red-400 mb-2">Danger zone</div>
          <div className="text-gray-400 mb-2 text-sm">
            Permanently delete your account. You will be asked to confirm the deletion from an email link.
          </div>
          <button className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 float-right">
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}
