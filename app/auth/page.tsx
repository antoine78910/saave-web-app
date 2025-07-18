"use client";

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

type AuthError = {
  message: string;
};

export default function AuthPage() {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSignIn, setIsSignIn] = useState(true);
  const router = useRouter();

  // La popup de confirmation a été remplacée par une alerte simple

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ne pas continuer si les clés Supabase ne sont pas disponibles
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setAuthError("Configuration Supabase manquante. Veuillez configurer vos variables d'environnement.");
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    // Initialiser le client Supabase uniquement au moment de l'authentification
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    try {
      if (isSignIn) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push('/app'); // Redirection vers /app au lieu de /
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        // Utiliser une alerte simple puisque la popup n'est pas implémentée
        alert("Email de vérification envoyé ! Veuillez vérifier votre boîte de réception.");
      }
    } catch (error) {
      const err = error as AuthError;
      setAuthError(err.message || "Une erreur s'est produite");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // Ne pas continuer si les clés Supabase ne sont pas disponibles
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setAuthError("Configuration Supabase manquante. Veuillez configurer vos variables d'environnement.");
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    // Initialiser le client Supabase uniquement au moment de l'authentification
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error) {
      const err = error as AuthError;
      setAuthError(err.message || "Une erreur s'est produite");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center">
      <div className="max-w-md w-full bg-[#1c1c1c] p-8 rounded-lg shadow-lg">
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
        <div className="relative">
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
        <h2 className="mt-6 text-lg font-medium text-white">
          {isSignIn ? "Sign in to your account" : "Create a new account"}
        </h2>
        <p className="text-sm text-gray-400">
          {isSignIn ? "Enter your email and password to access your bookmarks" : "Sign up to start using Saave"}
        </p>
        <form className="mt-8 space-y-6" onSubmit={handleAuth}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-400">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-[#2c2c2c] border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-150"
                placeholder="me@example.com"
              />
            </div>
            <div>
              <div className="flex justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-400">Password</label>
                {isSignIn && (
                  <a href="#" className="text-xs text-gray-400 hover:text-white">
                    Forgot your password?
                  </a>
                )}
              </div>
              <div className="relative">
  <input
    id="password"
    name="password"
    type={showPassword ? "text" : "password"}
    autoComplete={isSignIn ? "current-password" : "new-password"}
    required
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="mt-1 block w-full px-3 py-2 bg-[#2c2c2c] border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-150 pr-10"
    placeholder="••••••••"
  />
  <button
    type="button"
    tabIndex={-1}
    onClick={() => setShowPassword((v) => !v)}
    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 focus:outline-none"
    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
  >
    {showPassword ? (
      // Icône œil barré classique
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223C5.684 6.165 8.642 3.75 12 3.75c3.358 0 6.316 2.415 8.02 4.473a3.375 3.375 0 010 4.554C18.316 17.835 15.358 20.25 12 20.25c-3.358 0-6.316-2.415-8.02-4.473a3.375 3.375 0 010-4.554z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
      </svg>
    ) : (
      // Icône œil classique
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223C5.684 6.165 8.642 3.75 12 3.75c3.358 0 6.316 2.415 8.02 4.473a3.375 3.375 0 010 4.554C18.316 17.835 15.358 20.25 12 20.25c-3.358 0-6.316-2.415-8.02-4.473a3.375 3.375 0 010-4.554z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )}
  </button>
</div>
            </div>
          </div>
          {authError && (
            <div className="text-red-500 text-sm">{authError}</div>
          )}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
            >
              {isLoading ? "Processing..." : isSignIn ? "Sign In" : "Sign Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
