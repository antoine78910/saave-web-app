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

type BookmarkStatus = 'loading' | 'complete' | 'error';

export default function AppPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  
  // Rediriger vers auth si pas connecté
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [authLoading, user, router]);

  // État pour les notifications toast
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  
  // État pour les bookmarks en cours de traitement
  const [processingBookmarks, setProcessingBookmarks] = useState<Set<string>>(new Set());

  // Fonction pour ajouter un toast
  const addToast = React.useCallback((message: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 3000) => {
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
  
  // Charger les bookmarks de l'utilisateur depuis l'API
  const loadUserBookmarks = React.useCallback(async () => {
    if (user?.id) {
      try {
        const response = await fetch(`/api/bookmarks?user_id=${user.id}`);
        if (response.ok) {
          const userBookmarks = await response.json();
          setBookmarks(userBookmarks);
        }
      } catch (error) {
        console.error('Error loading user bookmarks:', error);
      }
    }
  }, [user?.id]);

  React.useEffect(() => {
    loadUserBookmarks();
  }, [loadUserBookmarks]);

  // Recharger les bookmarks toutes les 5 secondes pour détecter les ajouts de l'extension
  React.useEffect(() => {
    if (user?.id) {
      const interval = setInterval(() => {
        loadUserBookmarks();
      }, 5000); // Recharger toutes les 5 secondes

      return () => clearInterval(interval);
    }
  }, [user?.id, loadUserBookmarks]);

  const [showMenu, setShowMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    bookmark: Bookmark | null;
  } | null>(null);
  

  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  
  const [currentProgress, setCurrentProgress] = useState<{
    step: BookmarkProcessStep;
    url: string;
    domain: string;
    title?: string;
    description?: string;
    summary?: string;
    thumbnail?: string;
  }>({ step: 'idle', url: '', domain: '' });
  
  const userName = user?.email?.split('@')[0] || 'User';
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
  
  // État pour suivre le processus d'ajout de bookmark
  const [processState, setProcessState] = useState<{
    step: BookmarkProcessStep;
    url: string;
    domain: string;
    title?: string;
    favicon?: string;
    thumbnail?: string;
  }>({ step: 'idle', url: '', domain: '' });
  
  // Hook pour gérer l'abonnement
  const { subscription, loading: subscriptionLoading, canAddBookmark, getRemainingBookmarks } = useSubscription(userEmail);

  // Surveiller les nouveaux bookmarks et afficher des notifications
  React.useEffect(() => {
    bookmarks.forEach(bookmark => {
      // Si c'est un nouveau bookmark en cours de traitement
      if (bookmark.status === 'loading' && !processingBookmarks.has(bookmark.id)) {
        setProcessingBookmarks(prev => new Set(prev).add(bookmark.id));
      }
      // Si un bookmark a fini de se traiter
      else if (bookmark.status === 'complete' && processingBookmarks.has(bookmark.id)) {
        setProcessingBookmarks(prev => {
          const newSet = new Set(prev);
          newSet.delete(bookmark.id);
          return newSet;
        });
      }
      // Si un bookmark a échoué
      else if (bookmark.status === 'error' && processingBookmarks.has(bookmark.id)) {
        setProcessingBookmarks(prev => {
          const newSet = new Set(prev);
          newSet.delete(bookmark.id);
          return newSet;
        });
      }
    });
  }, [bookmarks, processingBookmarks]);

  // Sauvegarde automatique des bookmarks dans localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('saave_bookmarks', JSON.stringify(bookmarks));
    }
  }, [bookmarks]);

  // Dans la fonction handleAddBookmark
  const handleAddBookmark = async (url: string) => {
    // Vérifier si l'utilisateur peut ajouter un bookmark
    if (!canAddBookmark(bookmarks.length)) {
      addToast(
        `You've reached your limit of ${subscription?.bookmarkLimit} bookmarks. Upgrade to Pro for unlimited bookmarks!`, 
        'error', 
        5000
      );
      router.push('/upgrade');
      return;
    }

    if (!user?.id) {
      addToast('You must be logged in to add bookmarks', 'error');
      return;
    }

    const bookmarkId = Date.now().toString();
    let content = '';
    let title = '';
    let description = '';
    let favicon = '';
    let thumbnail = '';
    let tags: string[] = [];
    
    try {
      // Ajouter le bookmark initial avec le statut "loading"
      const newBookmark: Bookmark = {
        id: bookmarkId,
        url,
        title: 'Loading...',
        description: '',
        tags: [],
        status: 'loading',
        processingStep: 'scraping',
        createdAt: new Date(),
      };
      
      setBookmarks(prev => [newBookmark, ...prev]);
      
      // Fonction utilitaire pour mettre à jour l'étape de traitement
      const updateBookmarkStep = (step: BookmarkProcessStep, updates: Partial<Bookmark> = {}) => {
        setBookmarks(prev => prev.map(b => 
          b.id === bookmarkId 
            ? { ...b, processingStep: step, ...updates }
            : b
        ));
        setCurrentProgress(prev => ({ ...prev, step }));
      };

      // Extraction du domaine
      const domain = new URL(url).hostname;
      setCurrentProgress({
        step: 'scraping' as BookmarkProcessStep,
        url,
        domain: domain.replace('www.', '')
      });
      
      // Scraping du contenu
      try {
        updateBookmarkStep('scraping');
        const response = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        
        if (response.ok) {
          const data = await response.json();
          content = data.content;
        }
      } catch (error) {
        console.error('Error during scraping:', error);
      }
      
      // Extraction des métadonnées
      try {
        updateBookmarkStep('metadata');
        const metadataResponse = await fetch('/api/extract-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, content })
        });
        
        if (metadataResponse.ok) {
          const data = await metadataResponse.json();
          title = data.title || domain.replace('www.', '');
          description = data.description || 'No description available';
          favicon = data.favicon || '';
          tags = Array.isArray(data.tags) ? data.tags : [];
          console.log('Metadata extracted:', { title, description, favicon, tags });
          updateBookmarkStep('metadata', { title, description, favicon, tags });
        } else {
          console.warn('Metadata extraction failed, using fallback');
          title = domain.replace('www.', '');
          description = 'No description available';
        }
      } catch (error) {
        console.error('Error during metadata extraction:', error);
        title = domain.replace('www.', '');
        description = 'No description available';
      }
      
      // Capture d'écran
      try {
        updateBookmarkStep('screenshot');
        const screenshotResponse = await fetch('/api/screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        
        if (screenshotResponse.ok) {
          const data = await screenshotResponse.json();
          thumbnail = data.url;
          updateBookmarkStep('screenshot', { thumbnail });
        }
      } catch (error) {
        console.error('Error during screenshot:', error);
      }
      
      // Sauvegarde via API
      updateBookmarkStep('saving');
      
      const bookmarkData = {
        url,
        title: title || domain.replace('www.', ''),
        description: description || 'No description available',
        favicon,
        thumbnail,
        tags,
        user_id: user.id,
        source: 'webapp'
      };

      console.log('Saving bookmark with data:', bookmarkData);

      const saveResponse = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookmarkData)
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save bookmark to server');
      }

      const savedBookmark = await saveResponse.json();
      console.log('Bookmark saved successfully:', savedBookmark);
      
      // Finalisation
      updateBookmarkStep('finished');
      
      // Marquer comme terminé avec toutes les données collectées
      const finalBookmark: Bookmark = {
        id: savedBookmark.id, // Utiliser l'ID du serveur
        url,
        title: title || domain.replace('www.', ''),
        description: description || 'No description available',
        favicon,
        thumbnail,
        tags,
        status: 'complete',
        createdAt: new Date(savedBookmark.created_at),
        processingStep: 'finished'
      };

      setBookmarks(prev => prev.map(b => 
        b.id === bookmarkId ? finalBookmark : b
      ));
      
      setCurrentProgress({ step: 'idle' as BookmarkProcessStep, url: '', domain: '' });
      
      addToast('Bookmark added successfully!', 'success');
      
    } catch (error: any) {
      console.error('Error adding bookmark:', error);
      setBookmarks(prev => prev.map(b => 
        b.id === bookmarkId 
          ? { ...b, status: 'error', error: error.message }
          : b
      ));
      setCurrentProgress(prev => ({ ...prev, step: 'error' as BookmarkProcessStep }));
      addToast(`Failed to add bookmark: ${error.message}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#181a1b] text-white flex flex-col items-center px-4 py-8">
      {/* Navbar */}
      <nav className="w-full sticky top-0 z-50 bg-[#181a1b] border-b border-gray-800 flex items-center px-4 h-14 mb-4">
        {/* Logo & branding */}
        <a href="/app" className="flex items-center select-none">
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
              subscription?.plan === 'pro' ? (
                `${bookmarks.length}/∞`
              ) : (
                `${bookmarks.length}/${subscription?.bookmarkLimit || 20}`
              )
            )}
          </button>
          {/* Upgrade - Ne s'affiche que si l'utilisateur n'est pas Pro */}
          {subscription?.plan !== 'pro' && (
            <a href="/upgrade" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-[#232526] shadow-xs hover:bg-accent hover:text-white h-8 px-3 border-accent text-accent font-bold">
              Upgrade
            </a>
          )}
          {/* Bouton Billing pour les utilisateurs Pro */}
          {subscription?.plan === 'pro' && (
            <button 
              onClick={async () => {
                if (subscription.customerId) {
                  try {
                    const response = await fetch('/api/stripe/portal', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ customerId: subscription.customerId }),
                    });
                    
                    if (response.ok) {
                      const { url } = await response.json();
                      window.location.href = url;
                    }
                  } catch (error) {
                    console.error('Error opening billing portal:', error);
                    addToast('Failed to open billing portal', 'error');
                  }
                }
              }}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-green-600 shadow-xs hover:bg-green-700 text-white h-8 px-3 font-bold"
            >
              Billing
            </button>
          )}
          {/* Menu utilisateur */}
          <UserMenu userEmail={userEmail} onSignOut={signOut} />
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
                // Réinitialiser le formulaire immédiatement
                setInputUrl('');
                setInputFavicon('');
                
                // Utiliser la fonction handleAddBookmark
                await handleAddBookmark(url);
              } catch (error) {
                console.error('Error adding bookmark:', error);
              }
            }}>
              <div className="relative flex-1">
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
                {inputFavicon && (
                  <img src={inputFavicon} alt="Favicon" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" />
                )}
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
                  onClick={(e) => {
                    e.preventDefault();
                    // TODO: Remplacer par l'URL réelle de l'extension Chrome
                    window.open('https://chrome.google.com/webstore', '_blank');
                  }}
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
                onDelete={(bookmark) => {
                  // Supprime le bookmark du state
                  setBookmarks((prev) => {
                    const newBookmarks = prev.filter((b) => b.id !== bookmark.id);
                    localStorage.setItem('saave_bookmarks', JSON.stringify(newBookmarks));
                    return newBookmarks;
                  });
                  // Ajouter notification de suppression
                  addToast(`Bookmark deleted successfully`, 'success');
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
                onDelete={(bookmark) => {
                  // Supprime le bookmark du state
                  setBookmarks((prev) => {
                    const newBookmarks = prev.filter((b) => b.id !== bookmark.id);
                    localStorage.setItem('saave_bookmarks', JSON.stringify(newBookmarks));
                    return newBookmarks;
                  });
                  // Ajouter notification de suppression
                  addToast(`Bookmark deleted successfully`, 'success');
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

        {/* Menu contextuel pour les bookmarks */}
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
                addToast(`Bookmark deleted successfully`, 'success');
                
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
        

      </div>
      
      {/* Barre de progression pendant le chargement d'un bookmark - supprimé */}
      
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
