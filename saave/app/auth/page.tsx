"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase-client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Toast from '../../components/Toast';

type AuthError = {
  message: string;
};

interface ToastType {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function AuthPage() {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSignIn, setIsSignIn] = useState(true);
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const router = useRouter();

  // Handle hash-based tokens (e.g., after email confirmation: /auth#access_token=...&refresh_token=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash?.replace(/^#/, '');
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const type = params.get('type');

    if (access_token && refresh_token) {
      console.log('🔑 AUTH PAGE: Hash tokens detected, setting session...', { type });
      supabase.auth
        .setSession({ access_token, refresh_token })
        .then(({ data, error }) => {
          console.log('📡 AUTH PAGE: setSession result:', { hasSession: !!data?.session, error });
          if (error) {
            console.error('❌ AUTH PAGE: setSession error:', error);
            return;
          }
          // Clean the hash from URL and go to /app
          try {
            window.history.replaceState({}, '', '/auth');
          } catch {}
          router.replace('/app');
        });
    }
  }, [router]);

  // Rediriger vers /app si déjà connecté
  useEffect(() => {
    const checkUser = async () => {
      console.log('🔍 AUTH PAGE: Vérification de la session existante...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🔍 AUTH PAGE: Session result:', { session: !!session, user: !!session?.user, error });
        
        if (error) {
          console.error('❌ AUTH PAGE: Erreur lors de la vérification de session:', error);
          return;
        }
        
        if (session?.user) {
          console.log('✅ AUTH PAGE: Utilisateur déjà connecté, redirection vers /app');
          router.push('/app');
        } else {
          console.log('❌ AUTH PAGE: Aucune session existante');
        }
      } catch (error) {
        console.error('❌ AUTH PAGE: Erreur dans checkUser:', error);
      }
    };
    checkUser();
  }, [router]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const isValidEmail = (v: string) => /\S+@\S+\.\S+/.test(v);
  const canSubmit = () => {
    const okEmail = isValidEmail(email);
    const okPassword = password.length >= 6;
    return okEmail && okPassword && !isLoading;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 AUTH: Début de l\'authentification', { isSignIn, email: email.substring(0, 5) + '...' });
    
    setIsLoading(true);
    setAuthError(null);

    try {
      if (isSignIn) {
        console.log('🔑 AUTH: Tentative de connexion par email/password...');
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        console.log('📡 AUTH: Réponse de signInWithPassword:', {
          hasUser: !!data.user,
          hasSession: !!data.session,
          userEmail: data.user?.email,
          error: error
        });

        if (error) {
          console.error('❌ AUTH: Erreur de connexion:', error);
          throw error;
        }

        if (data.session) {
          console.log('✅ AUTH: Session créée avec succès!', {
            userId: data.user?.id,
            email: data.user?.email,
            sessionId: data.session.access_token.substring(0, 20) + '...'
          });
          
          showToast('Welcome back! Redirecting…', 'success');
          
          // Attendre un peu pour que la session soit bien établie
          setTimeout(() => {
            console.log('🔄 AUTH: Redirection vers /app...');
            router.push('/app');
          }, 1000);
        } else {
          console.warn('⚠️ AUTH: Pas de session créée malgré l\'absence d\'erreur');
        }
      } else {
        console.log('📝 AUTH: Tentative d\'inscription...');
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        console.log('📡 AUTH: Réponse de signUp:', {
          hasUser: !!data.user,
          hasSession: !!data.session,
          needsConfirmation: !data.session && data.user && !data.user.email_confirmed_at,
          error: error
        });

        if (error) {
          console.error('❌ AUTH: Erreur d\'inscription:', error);
          throw error;
        }

        showToast('Account created successfully! Please check your email to verify your account.', 'success');
      }
    } catch (error) {
      console.error('❌ AUTH: Erreur complète:', error);
      const err = error as AuthError;
      setAuthError(err.message || "Une erreur s'est produite");
      showToast(err.message || "An error occurred", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    console.log('🚀 AUTH PAGE: Tentative de connexion Google...');
    setIsLoading(true);
    setAuthError(null);

    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log('🔗 AUTH PAGE: URL de redirection:', redirectUrl);
      
      console.log('🔧 AUTH PAGE: Configuration Supabase:', {
        hasSupabase: !!supabase,
        origin: window.location.origin
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      console.log('📡 AUTH PAGE: Réponse OAuth:', { data, error });

      if (error) {
        console.error('❌ AUTH PAGE: Erreur OAuth:', error);
        throw error;
      }
      
      console.log('✅ AUTH PAGE: OAuth initié avec succès, redirection en cours...');
    } catch (error) {
      console.error('❌ AUTH PAGE: Erreur complète:', error);
      const err = error as AuthError;
      setAuthError(err.message || "Une erreur s'est produite");
      showToast(err.message || "An error occurred", 'error');
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className=" max-w-md w-full bg-[#1c1c1c] p-8 rounded-lg shadow-lg">
          <div className="flex justify-center mb-4">
            <div className="relative h-32 w-48">
              <Image
                src="/logo.png"
                alt="Saave Logo"
                fill
                priority
                className="object-contain"
              />
            </div>
          </div>
          <h2 className="text-lg font-medium text-white mb-2">Welcome to Saave.io</h2>
          <p className="text-sm text-gray-400 mb-4">Never lose a link again</p>
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="group relative w-full flex justify-center py-2 px-4 border border-accent text-sm font-medium rounded-md text-white hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent mb-4"
          >
            <span className="flex items-center">
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </span>
          </button>
          <div className="relative mb-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-accent"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#1c1c1c] text-gray-400">OR CONTINUE WITH</span>
            </div>
          </div>
          <div className="mt-4 flex space-x-4">
            <button 
              type="button"
              onClick={() => setIsSignIn(true)}
              className={`flex-1 py-2 text-center text-sm font-medium rounded-md ${isSignIn ? 'bg-accent text-white' : 'text-gray-400 border border-accent'} transition-colors duration-150`}
            >
              Sign In
            </button>
            <button 
              type="button"
              onClick={() => setIsSignIn(false)}
              className={`flex-1 py-2 text-center text-sm font-medium rounded-md ${!isSignIn ? 'bg-accent text-white' : 'text-gray-400 border border-accent'} transition-colors duration-150`}
            >
              Sign Up
            </button>
          </div>
          <div className="space-y-2 mt-6">
            <label htmlFor="email" className="block text-sm font-medium text-gray-400">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              className={`mt-1 block w-full px-3 py-2 bg-[#2c2c2c] border ${emailTouched ? 'border-accent' : 'border-gray-600'} rounded-md text-white focus:outline-none focus:ring-2 focus:ring-accent`}
              placeholder="me@example.com"
            />
          </div>
          <div className="space-y-2 mt-3">
            <label htmlFor="password" className="block text-sm font-medium text-gray-400">Password</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isSignIn ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setPasswordTouched(true)}
                className="mt-1 block w-full px-3 py-2 bg-[#2c2c2c] border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="••••••••"
              />
            </div>
          </div>
          {authError && (
            <div className="text-red-500 text-sm mt-2">{authError}</div>
          )}
          <div className="mt-4">
            <button
              type="submit"
              disabled={!canSubmit()}
              className="group relative w/full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
              onClick={handleAuth}
            >
              {isLoading ? "Processing..." : isSignIn ? "Sign In" : "Sign Up"}
            </button>
          </div>
        </div>
      </div>
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 fex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
}
