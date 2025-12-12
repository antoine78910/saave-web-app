"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import BookmarkPopup from "../../components/BookmarkPopup";
import BookmarkProgressBar, { BookmarkProcessStep } from "../../components/BookmarkProgressBar";
import { BookmarkCard } from "../../components/BookmarkCard";
import { Bookmark } from "../../components/BookmarkGrid";
import { ToastManager, ToastItem } from "../../components/Toast";
import { useSubscription } from "../../src/hooks/useSubscription";
import { useAuth } from "../../src/hooks/useAuth";
import UserMenu from "../../components/UserMenu";
import { getSiteUrl } from "../../lib/urls";
import { supabase } from "../../lib/supabase-client";

// type BookmarkStatus = 'loading' | 'complete' | 'error'; // Temporarily unused

export default function AppPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  
  // Debug utilisateur
  React.useEffect(() => {
    console.log('🔍 État utilisateur dans AppPage:', { user, authLoading });
    if (user) {
      console.log('✅ Utilisateur connecté:', user.email, user.display_name);
    } else {
      console.log('❌ Aucun utilisateur connecté');
    }
  }, [user, authLoading]);
  
  // Rediriger vers auth si pas connecté
  React.useEffect(() => {
    if (!authLoading && !user) {
      console.log('🔄 Redirection vers /auth car pas d\'utilisateur');
      router.push(getSiteUrl('/auth'));
    }
  }, [authLoading, user, router]);

  // Support de l'auth cross-domaine via hash tokens (#access_token=...&refresh_token=...)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash?.replace(/^#/, '');
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(() => {
        try {
          window.history.replaceState({}, '', window.location.pathname);
        } catch {}
      }).catch(() => {});
    }
  }, []);

  // État pour les notifications toast
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  
  // État pour les bookmarks en cours de traitement
  const [processingBookmarks, setProcessingBookmarks] = useState<Set<string>>(new Set());

  // Fonction pour ajouter un toast
  const addToast = React.useCallback((message: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 2600) => {
    const id = Date.now().toString();
    setToasts(currentToasts => [...currentToasts, { id, message, type, duration }]);
  }, []);

  // Fonction pour supprimer un toast
  const removeToast = (id: string) => {
    setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
  };
  
  // Initialiser avec un tableau vide pour éviter les erreurs d'hydratation
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  
  // État pour la recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{bookmark: Bookmark, score: number}[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Charger les bookmarks de l'utilisateur depuis l'API
  const loadUserBookmarks = React.useCallback(async () => {
    if (user?.id) {
      try {
        console.log('🔄 [LOAD] Fetching bookmarks...');
        const response = await fetch(`/api/bookmarks?user_id=${user.id}`);
        if (response.ok) {
          const userBookmarks = await response.json();
          console.log('📦 [LOAD] Received bookmarks:', userBookmarks.length, 'bookmarks');
          // Remplacement intelligent: les versions API remplacent les locales, y compris les steps in-progress
          // Replace fully with server ordering; keeps in-progress first and newest first
          setBookmarks(userBookmarks);
        }
      } catch (error) {
        console.error('Error loading user bookmarks:', error);
      }
    }
  }, [user?.id]);

  // Chargement initial
  React.useEffect(() => {
    loadUserBookmarks();
  }, [loadUserBookmarks]);
  
  // Polling PERMANENT toutes les 3 secondes (simple et efficace)
  React.useEffect(() => {
    if (!user?.id) return;
    
    console.log('🔁 [POLLING] Démarrage du polling permanent (3s)');
    const interval = setInterval(() => {
      loadUserBookmarks();
    }, 3000);

    return () => {
      console.log('🛑 [POLLING] Arrêt du polling');
      clearInterval(interval);
    };
  }, [user?.id, loadUserBookmarks]);

  // Listen to cancel events from BookmarkCard to remove loading item immediately
  React.useEffect(() => {
    const handler = (event: any) => {
      const processingId = event?.detail?.processingId;
      const url = event?.detail?.url;
      if (!processingId && !url) return;
      setBookmarks(prev => prev.filter(b => {
        if (b.status !== 'loading') return true;
        const pid = (b as any).processingId || b.id;
        if (processingId && pid === processingId) return false;
        if (url && b.url === url) return false;
        return true;
      }));
      loadUserBookmarks();
      try {
        // Inform extension to hide any toasts if user cancelled
        window.dispatchEvent(new CustomEvent('saave:add-error', { detail: { message: 'cancelled' } }));
      } catch {}
    };
    window.addEventListener('saave:cancel-processing', handler as EventListener);
    return () => window.removeEventListener('saave:cancel-processing', handler as EventListener);
  }, [loadUserBookmarks]);

  // Gérer les liens en attente depuis la landing page
  React.useEffect(() => {
    const handlePendingBookmark = () => {
      const pendingUrl = sessionStorage.getItem('pendingBookmarkUrl');
      if (pendingUrl && user) {
        console.log('🔗 Lien en attente détecté:', pendingUrl);
        setInputUrl(pendingUrl);
        sessionStorage.removeItem('pendingBookmarkUrl');
        
        // Déclencher automatiquement l'ajout du bookmark
        setTimeout(() => {
          const addButton = document.querySelector('form button[data-slot="button"]');
          if (addButton instanceof HTMLElement) {
            console.log('🚀 Ajout automatique du bookmark');
            addButton.click();
          }
        }, 500);
      }
    };

    if (user) {
      handlePendingBookmark();
    }
  }, [user]);

  // Gérer les demandes de l'extension Chrome
  React.useEffect(() => {
    // Écouter les événements de l'extension
    const handleExtensionBookmarkRequest = (event: CustomEvent) => {
      console.log('🎯 WEBAPP: Événement extensionBookmarkRequest reçu:', event);
      console.log('🎯 WEBAPP: event.detail:', event.detail);
      console.log('🎯 WEBAPP: user état:', user);
      console.log('🎯 WEBAPP: subscriptionLoading:', subscriptionLoading);
      
      if (user && event.detail?.url) {
        console.log('🔗 WEBAPP: Demande de bookmark depuis l\'extension:', event.detail.url);
        setInputUrl(event.detail.url);
        
        // Auto-submit après un petit délai ET quand la subscription est chargée
        const tryAutoSubmit = () => {
          console.log('🔄 WEBAPP: tryAutoSubmit - subscriptionLoading:', subscriptionLoading);
          if (subscriptionLoading) {
            console.log('⏳ WEBAPP: Attente du chargement de la subscription pour auto-submit...');
            setTimeout(tryAutoSubmit, 200);
            return;
          }
          
          console.log('✅ WEBAPP: Subscription chargée, déclenchement auto-submit immédiat...');
          // Soumission directe sans dépendre du bouton
          (async () => {
            try {
              await handleAddBookmark(event.detail.url);
            } catch (e) {
              console.error('❌ WEBAPP: Auto-submit direct échoué:', e);
            }
          })();
        };
        
        tryAutoSubmit();
      } else {
        console.log('❌ WEBAPP: Conditions non remplies - user:', !!user, 'url:', event.detail?.url);
      }
    };

    // Vérifier sessionStorage pour les demandes de l'extension
    const handleExtensionStorageRequest = () => {
      const extensionUrl = sessionStorage.getItem('extensionBookmarkUrl');
      if (extensionUrl && user) {
        console.log('🔗 URL depuis extension (sessionStorage):', extensionUrl);
        setInputUrl(extensionUrl);
        sessionStorage.removeItem('extensionBookmarkUrl');
        
        // Auto-submit après un petit délai ET quand la subscription est chargée
        const tryAutoSubmit = () => {
          if (subscriptionLoading) {
            console.log('⏳ Attente du chargement de la subscription pour auto-submit...');
            setTimeout(tryAutoSubmit, 200);
            return;
          }
          
          setTimeout(() => {
            const addButton = document.querySelector('form button[data-slot="button"]');
            if (addButton instanceof HTMLElement) {
              console.log('🚀 Ajout automatique du bookmark depuis extension');
              addButton.click();
            }
          }, 500);
        };
        
        tryAutoSubmit();
      }
    };

    // Vérifier les paramètres URL pour les demandes de l'extension
    const handleExtensionUrlParams = () => {
      if (typeof window !== 'undefined' && user) {
        const urlParams = new URLSearchParams(window.location.search);
        const extensionUrl = urlParams.get('extensionUrl');
        const extUrl2 = urlParams.get('url'); // support chrome action injection
        
        const candidate = extensionUrl || extUrl2;
        if (candidate) {
          console.log('🔗 URL depuis extension (URL params):', candidate);
          setInputUrl(candidate);
          
          // Nettoyer l'URL
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
          
          // Auto-submit après un petit délai ET quand la subscription est chargée
          const tryAutoSubmit = () => {
            if (subscriptionLoading) {
              console.log('⏳ Attente du chargement de la subscription pour auto-submit...');
              setTimeout(tryAutoSubmit, 200);
              return;
            }
            
            setTimeout(() => {
              const addButton = document.querySelector('form button[data-slot="button"]');
              if (addButton instanceof HTMLElement) {
              console.log('🚀 Ajout automatique du bookmark depuis extension');
              addButton.click();
              }
            }, 500);
          };
          
          tryAutoSubmit();
        }
      }
    };

    if (user) {
      // Écouter l'événement personnalisé
      window.addEventListener('extensionBookmarkRequest', handleExtensionBookmarkRequest as EventListener);
      
      // Vérifier sessionStorage
      handleExtensionStorageRequest();
      
      // Vérifier les paramètres URL
      handleExtensionUrlParams();
    }

    return () => {
      window.removeEventListener('extensionBookmarkRequest', handleExtensionBookmarkRequest as EventListener);
    };
  }, [user]);


  // const [showMenu, setShowMenu] = useState(false); // Temporarily unused
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    bookmark: Bookmark | null;
    visible?: boolean;
  } | null>(null);
  

  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  
  // Remove global overlay progress state; progress shown per-card via server merge
  
  // const userName = user?.email?.split('@')[0] || 'User'; // Temporarily unused
  const userEmail = user?.email || 'No email';
  
  // Fonction de recherche intelligente
  const searchBookmarks = React.useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    const normalizedQuery = query.toLowerCase().trim();
    
    // Fonction pour calculer un score de pertinence
    const calculateScore = (bookmark: Bookmark): number => {
      let score = 0;
      
      // Titre: correspondance exacte (20 points), contient (10 points)
      if (bookmark.title?.toLowerCase() === normalizedQuery) score += 20;
      else if (bookmark.title?.toLowerCase().includes(normalizedQuery)) score += 10;
      
      // Description: correspondance exacte (10 points), contient (5 points)
      if (bookmark.description?.toLowerCase() === normalizedQuery) score += 10;
      else if (bookmark.description?.toLowerCase().includes(normalizedQuery)) score += 5;
      
      // Notes personnelles: correspondance exacte (15 points), contient (10 points)
      // Notes personnelles ont un poids important car elles sont spécifiques à l'utilisateur
      if (bookmark.personalNotes?.toLowerCase() === normalizedQuery) score += 15;
      else if (bookmark.personalNotes?.toLowerCase()?.includes(normalizedQuery)) score += 10;
      
      // Tags: 15 points par tag correspondant
      if (bookmark.tags) {
        bookmark.tags.forEach(tag => {
          if (tag.toLowerCase() === normalizedQuery) score += 15;
          else if (tag.toLowerCase().includes(normalizedQuery)) score += 8;
        });
      }
      
      // URL: 5 points si l'URL contient la requête
      if (bookmark.url.toLowerCase().includes(normalizedQuery)) score += 5;
      
      return score;
    };
    
    // Calcule les scores et trie les résultats
    const results = bookmarks
      .map(bookmark => ({ bookmark, score: calculateScore(bookmark) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);
    
    setSearchResults(results);
  }, [bookmarks]);
  
  // Mettre à jour les résultats de recherche quand la requête change
  React.useEffect(() => {
    searchBookmarks(searchQuery);
  }, [searchQuery, searchBookmarks]);
  
  // État pour l'URL en cours de saisie et son favicon
  const [inputUrl, setInputUrl] = useState('');
  const [inputFavicon, setInputFavicon] = useState('');
  
  // État pour suivre le processus d'ajout de bookmark - Temporarily unused
  // const [processState, setProcessState] = useState<{
  //   step: BookmarkProcessStep;
  //   url: string;
  //   domain: string;
  //   title?: string;
  //   favicon?: string;
  //   thumbnail?: string;
  // }>({ step: 'idle', url: '', domain: '' });
  
  // Hook pour gérer l'abonnement
  const { subscription, loading: subscriptionLoading, canAddBookmark } = useSubscription(userEmail);
  // getRemainingBookmarks temporarily unused

  // Surveiller les nouveaux bookmarks et afficher des notifications
  React.useEffect(() => {
    const lastStepById: Record<string, string> = (window as any).__saaveLastStepById || {};
    bookmarks.forEach(bookmark => {
      // Si c'est un nouveau bookmark en cours de traitement
      if (bookmark.status === 'loading' && !processingBookmarks.has(bookmark.id)) {
        setProcessingBookmarks(prev => new Set(prev).add(bookmark.id));
        try {
          console.log('🚀 [APP] Bookmark started - notifying extension:', bookmark.id);
          // Méthode 1: window.postMessage pour que le content script le relaie
          try {
            window.postMessage({
              type: 'saave:bookmarkStarted',
              id: bookmark.id,
              url: bookmark.url
            }, '*');
            console.log('✅ [APP] Notification sent via postMessage');
          } catch (e) {
            console.error('Error sending postMessage:', e);
          }
          
          // Méthode 2: chrome.runtime.sendMessage (fallback direct)
          const chromeRuntime = typeof window !== 'undefined' ? (window as any).chrome?.runtime : undefined;
          if (chromeRuntime?.sendMessage) {
            const extensionId = 'lkeakhjmpajcicammgfjejiphecfcnii'; // ID de l'extension Saave
            chromeRuntime.sendMessage(
              extensionId,
              { type: 'bookmarkStarted', id: bookmark.id, url: bookmark.url },
              (response: any) => {
                const lastError = chromeRuntime.lastError;
                if (lastError) {
                  console.log('⚠️ Direct extension message failed:', lastError.message);
                } else {
                  console.log('✅ Extension notified directly', response);
                }
              }
            );
          }
          
          // Garder aussi window.dispatchEvent pour compatibilité
          window.dispatchEvent(new CustomEvent('saave:add-started', { detail: { id: bookmark.id, url: bookmark.url } }));
        } catch (e) {
          console.error('Error notifying extension:', e);
        }
      }
      // Si un bookmark a fini de se traiter
      else if (bookmark.status === 'complete' && processingBookmarks.has(bookmark.id)) {
        setProcessingBookmarks(prev => {
          const newSet = new Set(prev);
          newSet.delete(bookmark.id);
          return newSet;
        });
        try {
          window.dispatchEvent(new CustomEvent('saave:add-finished', { detail: { id: bookmark.id, url: bookmark.url } }));
        } catch {}
      }
      // Si un bookmark a échoué
      else if (bookmark.status === 'error' && processingBookmarks.has(bookmark.id)) {
        setProcessingBookmarks(prev => {
          const newSet = new Set(prev);
          newSet.delete(bookmark.id);
          return newSet;
        });
        try {
          window.dispatchEvent(new CustomEvent('saave:add-error', { detail: { id: bookmark.id, url: bookmark.url, message: 'error' } }));
        } catch {}
      }

      // Dispatch progress on step changes (first step triggers success in extension)
      if (bookmark.status === 'loading' && bookmark.processingStep) {
        const last = lastStepById[bookmark.id];
        if (last !== bookmark.processingStep) {
          try {
            console.log('📊 [APP] Dispatching saave:add-progress - step:', bookmark.processingStep);
            window.dispatchEvent(new CustomEvent('saave:add-progress', { detail: { id: bookmark.id, step: bookmark.processingStep } }));
          } catch {}
          lastStepById[bookmark.id] = String(bookmark.processingStep);
        }
      }
    });
    (window as any).__saaveLastStepById = lastStepById;
  }, [bookmarks, processingBookmarks]);

  // Sauvegarde automatique des bookmarks dans localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('saave_bookmarks', JSON.stringify(bookmarks));
    }
  }, [bookmarks]);

  // Dans la fonction handleAddBookmark
  const handleAddBookmark = async (url: string) => {
    console.log('🚀 WEBAPP: handleAddBookmark appelé avec URL:', url);
    console.log('🚀 WEBAPP: subscriptionLoading:', subscriptionLoading);
    console.log('🚀 WEBAPP: subscription:', subscription);
    console.log('🚀 WEBAPP: bookmarks.length:', bookmarks.length);
    
    // Attendre que la subscription soit chargée avant de vérifier
    if (subscriptionLoading) {
      console.log('⏳ WEBAPP: Attente du chargement de la subscription...');
      return;
    }
    
    console.log('🔍 WEBAPP: Vérification canAddBookmark...');
    const canAdd = canAddBookmark(bookmarks.length);
    console.log('🔍 WEBAPP: canAddBookmark result:', canAdd);
    
    // Vérifier si l'utilisateur peut ajouter un bookmark
    if (!canAdd) {
      console.log('❌ WEBAPP: Limite atteinte, redirection vers upgrade');
      addToast(
        `You've reached your limit of ${subscription?.bookmarkLimit} bookmarks. Upgrade to Pro for unlimited bookmarks!`, 
        'error', 
        5000
      );
      router.push('/upgrade');
      return;
    }
    
    console.log('✅ WEBAPP: Vérification passée, poursuite du processus...');

    if (!user?.id) {
      addToast('You must be logged in to add bookmarks', 'error');
      return;
    }
    try {
      // Call backend orchestrator which persists progress to R2 and merges via GET
      const res = await fetch('/api/bookmarks/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      if (!res.ok) {
        // Clone to avoid double-read errors
        const clone = res.clone()
        let data: any = null
        try { data = await res.json() } catch {}
        const text = data ? '' : await clone.text()

        if (res.status === 409 || data?.duplicate || /duplicate/i.test(text)) {
          addToast('Bookmark already saved', 'success')
          return
        }

        const message = typeof data === 'string'
          ? data
          : (data?.error || text || 'Process failed')
        throw new Error(message)
      }
      // Trigger refresh to get in-progress card merged
      await loadUserBookmarks()
      addToast('Processing started…', 'info')
    } catch (error: any) {
      console.error('Error starting process:', error)
      addToast(`Failed to start: ${error.message}`, 'error')
    }
  };

  return (
    <div className="min-h-screen bg-[#181a1b] text-white flex flex-col items-center px-4 py-8">
      {/* Navbar */}
      <nav className="w-full sticky top-0 z-50 bg-[#181a1b] border-b border-gray-800 flex items-center px-4 h-14 mb-4">
        {/* Logo & branding */}
        <a href="/" className="flex items-center select-none">
          <Image src="/logo.png" alt="Saave logo" width={120} height={40} />
        </a>
        <div className="flex-1" />
        {/* Actions à droite */}
        <div className="flex items-center gap-2">
          {/* Compteur */}
          <button className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all border bg-[#232526] shadow-xs hover:bg-accent hover:text-white h-8 rounded-md gap-1.5 px-3 border-accent text-accent font-bold">
            {subscriptionLoading ? (
              'Loading...'
            ) : (
              (subscription?.bookmarkLimit === -1 || subscription?.plan === 'pro') ? (
                `${bookmarks.length}/∞`
              ) : (
                `${bookmarks.length}/${subscription?.bookmarkLimit ?? 20}`
              )
            )}
          </button>
          
          {/* Menu utilisateur */}
          <UserMenu 
            userEmail={userEmail} 
            displayName={user?.display_name}
            onSignOut={signOut}
            isPro={subscription?.plan === 'pro'}
          />
        </div>
      </nav>

      {/* Search bar */}
      <div className="w-full max-w-2xl mx-auto mb-8">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="w-4 h-4 text-gray-500" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="search"
            id="search"
            className="block w-full p-3 pl-10 text-sm border rounded-lg bg-[#232526] border-gray-700 placeholder-gray-400 text-white focus:ring-green-500 focus:border-green-500 outline-none"
            placeholder="Search bookmarks by title, tags or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* Grille de bookmarks ou carte d'accueil */}
      <div className="w-full max-w-[90vw] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Onboarding card qui ne s'affiche que lorsqu'il n'y a pas de recherche active */}
        {!searchQuery && (
          <div className="bg-[#232526] text-white flex flex-col rounded-xl border border-gray-700 shadow-sm group w-full gap-4 overflow-hidden p-0 h-auto">
            <div className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-4 sm:px-6 pt-4">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bookmark text-primary size-4">
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                </svg>
                <div className="font-semibold leading-none text-sm sm:text-base">Add a bookmark</div>
              </div>
              <div className="text-gray-400 text-xs sm:text-sm">Paste any URL and it&apos;s safely stored—no friction.</div>
              <form className="flex items-center gap-2" onSubmit={async (e) => {
              e.preventDefault();
              const formUrl = inputUrl.trim();
              if (!formUrl) return;
              
              let url = formUrl;
              if (!/^https?:\/\//i.test(url)) {
                url = 'https://' + url;
              }
              
              try {
                // Réinitialiser le formulaire immédiatement et montrer loading sur le bouton
                setInputFavicon('');
                const btn = (e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement | null);
                if (btn) {
                  btn.disabled = true;
                  const original = btn.innerHTML;
                  btn.setAttribute('data-original', original);
                  btn.innerHTML = '<span class="inline-block w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin mr-2"></span>Adding…';
                }
                
                // Utiliser la fonction handleAddBookmark
                await handleAddBookmark(url);
                
                if (btn) {
                  const original = btn.getAttribute('data-original') || 'Add';
                  btn.innerHTML = original;
                  btn.disabled = false;
                }
                setInputUrl('');
              } catch (error) {
                console.error('Error adding bookmark:', error);
                const btn = (e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement | null);
                if (btn) {
                  const original = btn.getAttribute('data-original') || 'Add';
                  btn.innerHTML = original;
                  btn.disabled = false;
                }
              }
            }}>
              <div className="relative flex-1 flex items-center gap-3">
                {inputFavicon && (
                  <img src={inputFavicon} alt="Favicon" className="w-5 h-5 flex-shrink-0 rounded-sm" />
                )}
                <input
                  type="text"
                  placeholder="Paste a URL"
                  className="w-full px-3 py-2 bg-[#181a1b] border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  value={inputUrl}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setInputUrl(val);
                    
                    // Tenter d'obtenir le favicon lorsqu'on a une URL valide
                    if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
                      try {
                        const url = new URL(val);
                        setInputFavicon(`https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`);
                      } catch {
                        setInputFavicon('');
                      }
                    } else if (val) {
                      // Essayer avec https:// ajouté
                      try {
                        const url = new URL(`https://${val}`);
                        setInputFavicon(`https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`);
                      } catch {
                        setInputFavicon('');
                      }
                    } else {
                      setInputFavicon('');
                    }
                  }}
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition flex items-center gap-2"
                data-slot="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                </svg>
                Add
              </button>
            </form>
            </div>
            
            <div className="items-center px-4 sm:px-6 flex flex-col gap-2 border-t border-gray-600 pt-4 pb-4">
              <p className="text-xs sm:text-sm text-gray-400">Looking for quickly add a bookmark? Install our browser extension.</p>
              <div className="flex items-center justify-center">
                <a 
                  className="rounded-md hover:bg-accent/50 transition-colors p-2" 
                  href="/extensions"
                >
                  <img className="w-6 h-6 sm:w-8 sm:h-8" src="https://svgl.app/library/chrome.svg" alt="Chrome Extension" />
                </a>
              </div>
            </div>
            
            {/* Affichage de la barre de progression - supprimé */}
          </div>
        )}

        {/* Rendu des bookmarks existants */}
        {searchQuery ? (
          // Rendu des résultats de recherche
          searchResults.map(({ bookmark: bm }, index) => (
            <div key={bm.id} className="relative"> 
              {/* Badge Best match pour le premier résultat */}
              {index === 0 && searchResults.length > 0 && (
                <div className="absolute top-0 left-0 bg-green-600 text-white text-xs font-medium py-0.5 px-2 rounded-tl-lg rounded-br-md shadow z-10">
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Best match
                  </span>
                </div>
              )}
              
              {/* Utilisation du composant BookmarkCard */}
              <BookmarkCard 
                bookmark={{
                  ...bm,
                  isBestMatch: index === 0 && searchResults.length > 0
                }}
                onClick={() => {
                  // Ne pas ouvrir le popup si le bookmark est en erreur ou en chargement
                  if (bm.status === 'error' || bm.status === 'loading') return;
                  setSelectedBookmark(bm); // Nouveau popup simple
                }}
                isDeleting={deletingId === bm.id}
                onDelete={async (bookmark) => {
                  try {
                    console.log('🗑️ Suppression bookmark:', bookmark.id);
                    setDeletingId(bookmark.id);
                    
                    const response = await fetch(`/api/bookmarks?id=${bookmark.id}&user_id=${user?.id}`, {
                      method: 'DELETE',
                    });
                    
                    if (!response.ok) {
                      throw new Error('Failed to delete bookmark from server');
                    }
                    
                    // Supprimer du state local immédiatement
                    setBookmarks((prev) => prev.filter((b) => b.id !== bookmark.id));
                    // Rafraîchir depuis le serveur pour éviter la réapparition
                    await loadUserBookmarks();
                    
                    addToast(`Bookmark deleted`, 'success');
                    console.log('✅ Bookmark supprimé avec succès');
                  } catch (error) {
                    console.error('❌ Erreur suppression:', error);
                    addToast('Failed to delete bookmark', 'error');
                  } finally {
                    setDeletingId(null);
                  }
                }}
                onRetry={(bookmark: Bookmark) => {
                  // Logique pour réessayer l'ajout d'un bookmark en erreur
                  const url = bookmark.url;
                  // Supprimer d'abord l'ancien bookmark
                  setBookmarks((prevBookmarks) => {
                    const newBookmarks = prevBookmarks.filter((b) => b.id !== bookmark.id);
                    localStorage.setItem('saave_bookmarks', JSON.stringify(newBookmarks));
                    return newBookmarks;
                  });
                  
                  // Ensuite, préparer l'URL pour le formulaire
                  setInputUrl(url);
                  
                  // Simuler un clic sur le bouton Add après un court délai
                  setTimeout(() => {
                    const addButton = document.querySelector('form button[data-slot="button"]');
                    if (addButton instanceof HTMLElement) {
                      addButton.click();
                    }
                  }, 100);
                }}
                onContextMenu={(e: React.MouseEvent) => {
                  e.preventDefault();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    bookmark: bm,
                    visible: true
                  });
                }}
              />
            </div>
          ))
        ) : (
          // Rendu normal des bookmarks (sans recherche)
          bookmarks.map((bm) => (
            <div key={bm.id} className="relative">
              <BookmarkCard 
                bookmark={bm}
                onClick={() => {
                  if (bm.status === 'error' || bm.status === 'loading') return;
                  setSelectedBookmark(bm); // Nouveau popup simple
                }}
                isDeleting={deletingId === bm.id}
                onDelete={async (bookmark) => {
                  try {
                    console.log('🗑️ Suppression bookmark:', bookmark.id);
                    setDeletingId(bookmark.id);

                    // Si le bookmark est encore en cours, annuler le process côté backend
                    if (bookmark.status === 'loading' || (bookmark as any).processingId) {
                      try {
                        await fetch('/api/bookmarks/process/cancel', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: (bookmark as any).processingId || bookmark.id }),
                        });
                      } catch (err) {
                        console.warn('⚠️ Cancel during delete failed:', err);
                      }
                    }
                    
                    const response = await fetch(`/api/bookmarks?id=${bookmark.id}&user_id=${user?.id}`, {
                      method: 'DELETE',
                    });
                    
                    if (!response.ok) {
                      throw new Error('Failed to delete bookmark from server');
                    }
                    
                    setBookmarks((prev) => prev.filter((b) => b.id !== bookmark.id));
                    await loadUserBookmarks();
                    
                    addToast(`Bookmark deleted`, 'success');
                    console.log('✅ Bookmark supprimé avec succès');
                  } catch (error) {
                    console.error('❌ Erreur suppression:', error);
                    addToast('Failed to delete bookmark', 'error');
                  } finally {
                    setDeletingId(null);
                  }
                }}
                onRetry={(bookmark) => {
                  // Logique pour réessayer un bookmark en erreur
                  const url = bookmark.url;
                  setBookmarks((prevBookmarks) => {
                    const newBookmarks = prevBookmarks.filter((b) => b.id !== bookmark.id);
                    localStorage.setItem('saave_bookmarks', JSON.stringify(newBookmarks));
                    return newBookmarks;
                  });
                  setInputUrl(url);
                  setTimeout(() => {
                    const addButton = document.querySelector('form button[data-slot="button"]');
                    if (addButton instanceof HTMLElement) {
                      addButton.click();
                    }
                  }, 100);
                }}
                onContextMenu={(e: React.MouseEvent) => {
                  e.preventDefault();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    bookmark: bm,
                    visible: true
                  });
                }}
              />
            </div>
          ))
        )}

        {/* Menu contextuel pour les bookmarks - Temporairement désactivé */}
        {/* TODO: Implémenter BookmarkContextMenu 
        {contextMenu && contextMenu.visible && contextMenu.bookmark && (
          <BookmarkContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            bookmark={contextMenu.bookmark}
            onDelete={(bookmark) => {
              // Supprime le bookmark du state
              setBookmarks((prev) => {
                const newBookmarks = prev.filter((b) => b.id !== bookmark.id);
                localStorage.setItem('saave_bookmarks', JSON.stringify(newBookmarks));
                
                // Ajouter notification de suppression
                addToast(\`Bookmark deleted successfully\`, 'success');
                
                return newBookmarks;
              });
              setContextMenu({ ...contextMenu, visible: false });
            }}
            onCopyLink={(bookmark) => {
              try {
                // Essaie explicitement de copier l'URL
                navigator.clipboard.writeText(bookmark.url);
                console.log('URL copiée:', bookmark.url);
              } catch {
                console.error('Erreur lors de la copie:');
              }
              // Ne ferme pas immédiatement le menu pour laisser le toast s'afficher
              setTimeout(() => {
                setContextMenu({ ...contextMenu, visible: false });
              }, 300);
            }}
            onClose={() => setContextMenu({ ...contextMenu, visible: false })}
          />
        )}
        */}
        

      </div>
      
      {/* Global overlay progress removed; progress is shown inside each card */}
      
      {/* Gestionnaire de notifications */}
      <ToastManager toasts={toasts} removeToast={removeToast} />
      
      {/* Nouveau popup simple pour afficher bookmark avec description, tags et screenshot */}
      {selectedBookmark && (
        <BookmarkPopup
          bookmark={selectedBookmark}
          onClose={() => setSelectedBookmark(null)}
        />
      )}
    </div>
  );
}
