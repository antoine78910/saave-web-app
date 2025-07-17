"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import BookmarkContextMenu from "../../components/BookmarkContextMenu";
import BookmarkDetailPopup from "../../components/BookmarkDetailPopup";
import BookmarkProgressBar, { BookmarkProcessStep } from "../../components/BookmarkProgressBar";
import { BookmarkCard } from "../../components/BookmarkCard";
import { Bookmark } from "../../components/BookmarkGrid";
import { ToastManager, ToastItem } from "../../components/Toast";

type BookmarkStatus = 'loading' | 'complete' | 'error';

const demoBookmarks: Bookmark[] = [];



export default function AppPage() {
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
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(demoBookmarks);
  
  // État pour la recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{bookmark: Bookmark, score: number}[]>([]);
  
  // Charger les bookmarks depuis localStorage (source principale)
  React.useEffect(() => {
    const loadBookmarks = async () => {
      try {
        // Charger depuis localStorage (vos anciens bookmarks)
        const saved = localStorage.getItem('saave_bookmarks');
        if (saved) {
          const parsedData = JSON.parse(saved);
          setBookmarks(parsedData);
        }
        
        // Vérifier s'il y a de nouveaux bookmarks depuis l'extension
        try {
          const response = await fetch('/api/bookmarks');
          if (response.ok) {
            const apiBookmarks = await response.json();
            if (Array.isArray(apiBookmarks) && apiBookmarks.length > 0) {
              // Fusionner avec les bookmarks existants
              const existingBookmarks = saved ? JSON.parse(saved) : [];
              const mergedBookmarks = [...existingBookmarks];
              
              // Ajouter seulement les nouveaux bookmarks de l'API
              apiBookmarks.forEach(apiBookmark => {
                const exists = existingBookmarks.find(b => b.url === apiBookmark.url);
                if (!exists) {
                  mergedBookmarks.unshift(apiBookmark); // Ajouter au début
                }
              });
              
              if (mergedBookmarks.length > existingBookmarks.length) {
                setBookmarks(mergedBookmarks);
                localStorage.setItem('saave_bookmarks', JSON.stringify(mergedBookmarks));
              }
            }
          }
        } catch (apiError) {
          console.log('API not available, using localStorage only');
        }
      } catch (error) {
        console.error('Error loading bookmarks:', error);
      }
    };
    
    loadBookmarks();
    
    // Vérifier les nouveaux bookmarks toutes les 3 secondes
    const interval = setInterval(loadBookmarks, 3000);
    
    return () => clearInterval(interval);
  }, []);
  const [showMenu, setShowMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    bookmark: Bookmark | null;
    visible: boolean;
  }>({ x: 0, y: 0, bookmark: null, visible: false });
  
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
  
  const [detailPopup, setDetailPopup] = useState<{
    bookmark: Bookmark | null;
    visible: boolean;
  }>({ bookmark: null, visible: false });
  
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
  const userName = '';
  const userEmail = 'anto.delbos@gmail.com';
  const router = useRouter();

  // Surveiller les nouveaux bookmarks et afficher des notifications
  React.useEffect(() => {
    bookmarks.forEach(bookmark => {
      // Si c'est un nouveau bookmark en cours de traitement
      if (bookmark.status === 'loading' && !processingBookmarks.has(bookmark.id)) {
        setProcessingBookmarks(prev => new Set(prev).add(bookmark.id));
        addToast(`📚 Processing bookmark: ${bookmark.title}`, 'info', 5000);
      }
      // Si un bookmark a fini de se traiter
      else if (bookmark.status === 'complete' && processingBookmarks.has(bookmark.id)) {
        setProcessingBookmarks(prev => {
          const newSet = new Set(prev);
          newSet.delete(bookmark.id);
          return newSet;
        });
        addToast(`✅ Bookmark saved: ${bookmark.title}`, 'success', 4000);
      }
      // Si un bookmark a échoué
      else if (bookmark.status === 'error' && processingBookmarks.has(bookmark.id)) {
        setProcessingBookmarks(prev => {
          const newSet = new Set(prev);
          newSet.delete(bookmark.id);
          return newSet;
        });
        addToast(`❌ Failed to process: ${bookmark.title}`, 'error', 4000);
      }
    });
  }, [bookmarks, processingBookmarks, addToast]);

  // Sauvegarde automatique des bookmarks dans localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('saave_bookmarks', JSON.stringify(bookmarks));
    }
  }, [bookmarks]);

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
          {/* Indicateur de traitement */}
          {processingBookmarks.size > 0 && (
            <div className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium h-8 rounded-md gap-1.5 px-3 bg-blue-600/20 text-blue-400 border border-blue-600/30">
              <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              Processing {processingBookmarks.size}
            </div>
          )}
          {/* Compteur */}
          <button className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all border bg-[#232526] shadow-xs hover:bg-accent hover:text-white h-8 rounded-md gap-1.5 px-3 border-accent text-accent font-bold">
            {bookmarks.length}/20
          </button>
          {/* Upgrade */}
          <a href="/upgrade" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-[#232526] shadow-xs hover:bg-accent hover:text-white h-8 px-3 border-accent text-accent font-bold">
            Upgrade
          </a>
          {/* Compte utilisateur avec menu déroulant */}
          <div className="relative">
            <button id="account-btn" className="inline-flex items-center justify-center rounded-md border bg-[#232526] shadow-xs hover:bg-accent hover:text-white h-8 px-3 text-sm font-medium" onClick={() => setShowMenu(m => !m)}>
              {userName || userEmail}
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-[#232526] rounded-lg shadow-lg border border-gray-700 z-50">
                <button onClick={() => { setShowMenu(false); router.push('/account'); }} className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-800 text-white">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Account
                </button>
                <button onClick={() => { setShowMenu(false); router.push('/billing'); }} className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-800 text-white">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 6h18M3 14h18M3 18h18" /></svg>
                  Billing
                </button>
                <button onClick={() => { setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-800 text-white border-t border-gray-700">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
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
                const parsed = new URL(url);
                // État de chargement
                const loadingId = Date.now().toString();
                const domain = parsed.hostname.replace('www.', '');
                
                // Créer d'abord un bookmark temporaire avec état de chargement
                const tempBookmark: Bookmark = {
                  id: loadingId,
                  url,
                  title: domain,
                  description: "Chargement en cours...",
                  thumbnail: null,
                  created_at: new Date().toISOString(),
                  tags: [],
                  status: 'loading',
                };
                
                setBookmarks((bms) => [tempBookmark, ...bms]);
                
                // Initialiser l'état du processus
                setProcessState({
                  step: 'scraping',
                  url,
                  domain
                });
                
                // Réinitialiser le formulaire immédiatement
                setInputUrl('');
                setInputFavicon('');

                // Processing order according to specifications
                try {
                  // 1. Scraping page content
                  setProcessState(prev => ({ ...prev, step: 'scraping' }));
                  await new Promise(r => setTimeout(r, 500)); // To show animation
                  
                  const contentRes = await fetch('/api/scrape', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                  });
                  const contentData = await contentRes.json();
                  
                  // 2. Extracting metadata
                  setProcessState(prev => ({ ...prev, step: 'metadata' }));
                  await new Promise(r => setTimeout(r, 500));
                  
                  // Extracting metadata with dedicated API
                  const metadataRes = await fetch('/api/extract-metadata', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                  });
                  const metadataData = await metadataRes.json();
                  
                  const title = metadataData.title || contentData.title || parsed.hostname.replace('www.', '');
                  const description = metadataData.description || contentData.description || "";
                  const favicon = metadataData.favicon || null;
                  
                  // Mettre à jour l'état avec le titre et le favicon
                  setProcessState(prev => ({ ...prev, step: 'metadata', title, favicon }));
                  await new Promise(r => setTimeout(r, 500));
                  
                  // 3. Taking screenshot
                  setProcessState(prev => ({ ...prev, step: 'screenshot' }));
                  await new Promise(r => setTimeout(r, 500));
                  
                  const screenshotRes = await fetch('/api/screenshot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                  });
                  const screenshotData = await screenshotRes.json();
                  const thumbnail = screenshotData.url || null;
                  
                  // Mettre à jour l'état avec la vignette
                  setProcessState(prev => ({ ...prev, step: 'screenshot', thumbnail }));
                  await new Promise(r => setTimeout(r, 500));
                  
                  // 4. Describing screenshot
                  setProcessState(prev => ({ ...prev, step: 'describe' }));
                  await new Promise(r => setTimeout(r, 500));
                  
                  const screenshotDescription = "Screenshot of the page";
                  
                  // 5. Summarizing page
                  setProcessState(prev => ({ ...prev, step: 'summary' }));
                  await new Promise(r => setTimeout(r, 500));
                  
                  const summary = contentData.summary || description || "No summary available";
                  
                  // 6. Finding relevant tags
                  setProcessState(prev => ({ ...prev, step: 'tags' }));
                  await new Promise(r => setTimeout(r, 500));
                  
                  const suggestedTags = metadataData.tags || [];
                  
                  // 7. Saving bookmark with all information
                  setProcessState(prev => ({ ...prev, step: 'saving' }));
                  await new Promise(r => setTimeout(r, 500));
                  
                  const updatedBookmark: Bookmark = {
                    id: loadingId,
                    url,
                    title,
                    description,
                    thumbnail: thumbnail || null,
                    favicon,
                    created_at: new Date().toISOString(),
                    tags: suggestedTags,
                    screenshotDescription,
                    summary,
                    status: 'complete' as BookmarkStatus,
                  };
                  
                  setBookmarks((currentBookmarks) => {
                    const updatedBookmarks = currentBookmarks.map(b => 
                      b.id === loadingId ? updatedBookmark : b
                    );
                    // Mettre à jour localStorage
                    localStorage.setItem('saave_bookmarks', JSON.stringify(updatedBookmarks));
                    // Afficher une notification de succès
                    addToast(`Bookmark ajouté : ${title}`, 'success');
                    return updatedBookmarks;
                  });
                  
                  // 8. Finishing
                  setProcessState(prev => ({ ...prev, step: 'finished' }));
                  await new Promise(r => setTimeout(r, 1000));
                  
                  // Réinitialiser l'état du processus
                  setTimeout(() => {
                    setProcessState({ step: 'idle', url: '', domain: '' });
                  }, 500);
                } catch {
                  // En cas d'erreur, mettre à jour le bookmark avec un état d'erreur
                  setProcessState(prev => ({ ...prev, step: 'error' }));
                  
                  setBookmarks((currentBookmarks) => {
                    const errorBookmarks = currentBookmarks.map(b => {
                      if (b.id === loadingId) {
                        return {
                          ...b,
                          description: "Une erreur s'est produite lors du traitement.",
                          status: 'error' as BookmarkStatus,
                        };
                      }
                      return b;
                    });
                    // Mettre à jour localStorage
                    localStorage.setItem('saave_bookmarks', JSON.stringify(errorBookmarks));
                    // Afficher une notification d'erreur
                    addToast(`Erreur lors de l'ajout du bookmark`, 'error');
                    return errorBookmarks;
                  });
                  
                  // Réinitialiser l'état du processus après un moment
                  setTimeout(() => {
                    setProcessState({ step: 'idle', url: '', domain: '' });
                  }, 3000);
                }
              } catch {
                // URL invalide: ne pas afficher d'alert, simplement ignorer
                console.log("URL invalide:", formUrl);
              }
            }}>
              <div className="flex items-center gap-2">
                <input 
                  name="url" 
                  type="text" 
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
                  className="flex h-9 w-full min-w-0 rounded-md border border-gray-700 bg-transparent px-3 py-1 text-xs sm:text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 transition-all" 
                  placeholder="https://example.com" 
                />
                <button 
                  type="submit"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-all h-9 px-4 py-1 bg-green-600 text-gray-50 hover:bg-green-700 disabled:pointer-events-none disabled:opacity-50"
                  disabled={!inputUrl}
                >
                  Add
                </button>
              </div>
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
            
            {/* Affichage de la barre de progression - temporairement désactivé */}
            {/* 
            {processState.step !== 'idle' && (
              <BookmarkProgressBar
                currentStep={processState.step}
                url={processState.url}
                domain={processState.domain}
              />
            )}
            */}
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
                  setDetailPopup({ bookmark: bm, visible: true });
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
                  setDetailPopup({ bookmark: bm, visible: true });
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
        {contextMenu.visible && contextMenu.bookmark && (
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
        
        {/* Popup détaillé pour les bookmarks */}
        {detailPopup.visible && detailPopup.bookmark && (
          <BookmarkDetailPopup
            bookmark={detailPopup.bookmark}
            onClose={() => setDetailPopup({ ...detailPopup, visible: false })}
            onDelete={(bookmark) => {
              // Supprime effectivement le bookmark du state
              setBookmarks((prev) => {
                const newBookmarks = prev.filter((b) => b.id !== bookmark.id);
                localStorage.setItem('saave_bookmarks', JSON.stringify(newBookmarks));
                return newBookmarks;
              });
              // Ajouter notification de suppression
              addToast(`Bookmark deleted successfully`, 'success');
              // Fermer le popup
              setDetailPopup({ ...detailPopup, visible: false });
            }}
            onOpen={() => {
              window.open(detailPopup.bookmark?.url, '_blank');
            }}
          />
        )}
      </div>
      
      {/* Barre de progression pendant le chargement d'un bookmark */}
      {processState.step !== 'idle' && (
        <BookmarkProgressBar
          currentStep={processState.step}
          url={processState.url}
          domain={processState.domain}
          title={processState.title}
          favicon={processState.favicon}
          thumbnail={processState.thumbnail}
          onCancel={() => setProcessState({ step: 'idle', url: '', domain: '' })}
        />
      )}
      
      {/* Gestionnaire de notifications */}
      <ToastManager toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
