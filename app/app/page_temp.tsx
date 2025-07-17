"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import BookmarkContextMenu from "../../components/BookmarkContextMenu";
import BookmarkDetailPopup from "../../components/BookmarkDetailPopup";
import BookmarkProgressBar, { BookmarkProcessStep } from "../../components/BookmarkProgressBar";

type BookmarkStatus = 'loading' | 'complete' | 'error';

interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  thumbnail: string | null;
  created_at: string;
  tags?: string[];
  summary?: string;
  screenshotDescription?: string;
  status?: BookmarkStatus;
}

const demoBookmarks: Bookmark[] = [];

export default function AppPage() {
  // Initialiser avec un tableau vide pour éviter les erreurs d'hydratation
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(demoBookmarks);
  
  // État pour la recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{bookmark: Bookmark, score: number}[]>([]);
  
  // Charger les bookmarks depuis localStorage uniquement côté client avec useEffect
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('saave_bookmarks');
      if (saved) {
        const parsedData = JSON.parse(saved);
        setBookmarks(parsedData);
      }
    } catch (error) {
      console.error('Error loading bookmarks from localStorage:', error);
    }
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
  }>({ step: 'idle', url: '', domain: '' });
  const userName = '';
  const userEmail = 'anto.delbos@gmail.com';
  const router = useRouter();

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
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Onboarding card qui ne s'affiche que lorsqu'il n'y a pas de recherche active */}
        {!searchQuery && (
          <div className="col-span-1 bg-[#232526] rounded-xl border shadow-sm flex flex-col w-full gap-4 overflow-hidden p-0 h-auto min-h-[240px]">
            <div className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-4">
              <h3 className="text-lg font-semibold leading-none tracking-tight text-white">
                Add a new bookmark
              </h3>
              <p className="text-sm text-gray-400">
                Enter a URL to add a new bookmark, it will be added to your collection.
              </p>
            </div>

            <div className="px-6 pb-4">
            <form onSubmit={async (e) => {
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

                // Ordre de traitement selon les spécifications
                try {
                  // 1. Scrapping du contenu de la page
                  setProcessState(prev => ({ ...prev, step: 'scraping' }));
                  await new Promise(r => setTimeout(r, 500)); // Pour montrer l'animation
                  
                  const contentRes = await fetch('/api/scrape', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                  });
                  const contentData = await contentRes.json();
                  
                  // 2. Extraction des métadonnées
                  setProcessState(prev => ({ ...prev, step: 'metadata' }));
                  await new Promise(r => setTimeout(r, 500));
                  
                  const title = contentData.title || parsed.hostname.replace('www.', '');
                  const description = contentData.description || "";
                  
                  // 3. Prise de screenshot
                  setProcessState(prev => ({ ...prev, step: 'screenshot' }));
                  await new Promise(r => setTimeout(r, 500));
                  
                  const screenshotRes = await fetch('/api/screenshot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                  });
                  const screenshotData = await screenshotRes.json();
                  const thumbnail = screenshotData.url || null;
                  
                  // 4. Description du screenshot
                  setProcessState(prev => ({ ...prev, step: 'describe' }));
                  await new Promise(r => setTimeout(r, 500));
                  
                  const screenshotDescription = "Capture d'écran de la page";
                  
                  // 5. Résumé de la page
                  setProcessState(prev => ({ ...prev, step: 'summary' }));
                  await new Promise(r => setTimeout(r, 500));
                  
                  const summary = contentData.summary || description || "Aucun résumé disponible";
                  
                  // 6. Recherche de tags pertinents
                  setProcessState(prev => ({ ...prev, step: 'tags' }));
                  await new Promise(r => setTimeout(r, 500));
                  
                  const suggestedTags = contentData.tags || [];
                  
                  // 7. Mettre à jour le bookmark avec toutes les informations
                  setProcessState(prev => ({ ...prev, step: 'saving' }));
                  await new Promise(r => setTimeout(r, 500));
                  
                  const updatedBookmark: Bookmark = {
                    id: loadingId,
                    url,
                    title,
                    description,
                    thumbnail,
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
                    localStorage.setItem('bookmarks', JSON.stringify(updatedBookmarks));
                    return updatedBookmarks;
                  });
                  
                  // 8. Terminer
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
                    localStorage.setItem('bookmarks', JSON.stringify(errorBookmarks));
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
              <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                <div className="relative flex items-center">
                  {inputFavicon && (
                    <div className="absolute left-2 flex items-center justify-center">
                      <Image 
                        src={inputFavicon} 
                        alt="favicon" 
                        width={16} 
                        height={16} 
                        className="mr-2" 
                        onError={() => setInputFavicon('')}
                      />
                    </div>
                  )}
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
                    className={`flex h-10 w-full rounded-md border border-gray-700 bg-transparent py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-600 focus-visible:ring-offset-2 ${inputFavicon ? 'pl-8' : 'pl-3'}`} 
                    placeholder="https://example.com" 
                  />
                </div>
                <button 
                  data-slot="button" 
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all h-10 px-4 py-2 bg-green-600 text-gray-50 hover:bg-green-700 disabled:pointer-events-none disabled:opacity-50"
                  disabled={!inputUrl}
                >
                  Add
                </button>
              </div>
            </form>
            
            {/* Affichage de la barre de progression */}
            {processState.step !== 'idle' && (
              <BookmarkProgressBar
                currentStep={processState.step}
                url={processState.url}
                domain={processState.domain}
              />
            )}
          </div>
        </div>
        )}

        {/* Rendu des bookmarks existants */}
        {(searchQuery ? searchResults.map(({ bookmark: bm }, index) => (
          <span key={bm.id} data-state="closed" data-slot="context-menu-trigger">
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
            <div
              data-slot="card"
              className="bg-[#232526] text-white flex flex-col rounded-xl border border-gray-700 shadow-sm group w-full overflow-hidden p-0"
              data-testid="bookmark-card-page"
              onClick={(e) => {
                if (bm.status === 'error') return; // Ne pas ouvrir le popup si en erreur
                
                e.preventDefault();
                e.stopPropagation();
                // Clic gauche ouvre le popup détaillé
                setDetailPopup({
                  bookmark: bm,
                  visible: true,
                });
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  bookmark: bm,
                  visible: true,
                });
              }}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              {/* Section de la capture d'écran - conditionnelle selon le statut */}
              {bm.status === 'error' ? (
                /* Affichage spécial pour les bookmarks en erreur */
                <div
                  data-slot="card-header"
                  className="relative h-32 bg-gray-900 flex flex-col items-center justify-center p-3 overflow-hidden"
                >
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></svg>
                    <span className="font-medium">Failed to Load</span>
                  </div>
                  
                  <div className="flex gap-2 mb-3 w-full">
                    <button 
                      className="flex-1 py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded-md flex items-center justify-center text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Réessayer d'ajouter le bookmark
                        const url = bm.url;
                        // Supprimer d'abord l'ancien bookmark
                        setBookmarks((prevBookmarks) => {
                          const newBookmarks = prevBookmarks.filter((b) => b.id !== bm.id);
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
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                      Rebookmark
                    </button>
                    
                    <button 
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Supprimer le bookmark
                        setBookmarks((prevBookmarks) => {
                          const newBookmarks = prevBookmarks.filter((b) => b.id !== bm.id);
                          localStorage.setItem('saave_bookmarks', JSON.stringify(newBookmarks));
                          return newBookmarks;
                        });
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                  </div>
                  
                  <div className="w-full px-2 py-2 bg-gray-700 rounded-md text-xs text-gray-300 text-center truncate">
                    {bm.url}
                  </div>

                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                    <span>Failed to fetch...</span>
                  </div>
                </div>
              ) : (
                /* Affichage normal pour les bookmarks sans erreur */
                <>
                  <div
                    data-slot="card-header"
                    className="relative h-32 overflow-hidden"
                  >
                    <a
                      className="h-full w-full block"
                      href={"/app/b/" + bm.id}
                      data-discover="true"
                      tabIndex={-1}
                    >
                      {bm.thumbnail ? (
                        <div className="relative w-full h-full">
                          <Image
                            alt={bm.title}
                            className="opacity-100 transition-opacity duration-200 object-cover object-center"
                            src={bm.thumbnail}
                            fill
                            sizes="(max-width: 640px) 100vw, 300px"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900">
                          <span className="text-gray-500 text-xs">No preview</span>
                        </div>
                      )}
                    </a>
                    
                    {/* Overlay avec gradient et actions */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-between p-3">
                      <div className="flex gap-1">
                        <button 
                          className="p-2 bg-black/50 rounded-full hover:bg-black/80 transition text-red-400 hover:text-red-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            // Supprimer le bookmark
                            setBookmarks((prev: Bookmark[]) => {
                              const newBookmarks = prev.filter((b: Bookmark) => b.id !== bm.id);
                              localStorage.setItem('saave_bookmarks', JSON.stringify(newBookmarks));
                              return newBookmarks;
                            });
                          }}
                          title="Delete bookmark"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>
                        <button 
                          className="p-2 bg-black/50 rounded-full hover:bg-black/80 transition text-blue-400 hover:text-blue-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            // Copier le lien
                            navigator.clipboard.writeText(bm.url);
                            
                            // Afficher un toast temporaire
                            const toast = document.createElement('div');
                            toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white py-2 px-4 rounded-md shadow-lg z-50 flex items-center gap-2';
                            toast.innerHTML = `
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
                              <span>Link copied!</span>
                            `;
                            document.body.appendChild(toast);
                            
                            // Supprimer le toast après 2 secondes
                            setTimeout(() => {
                              toast.remove();
                            }, 2000);
                          }}
                          title="Copy link"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
                        </button>
                      </div>
                      
                      <div className="flex gap-1">
                        <a 
                          href={bm.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button 
                            className="p-2 bg-black/50 rounded-full hover:bg-black/80 transition"
                            title="Open link"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>
                          </button>
                        </a>
                        <button 
                          className="p-2 bg-black/50 rounded-full hover:bg-black/80 transition"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              bookmark: bm,
                              visible: true
                            });
                          }}
                          title="More options"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12h.01"></path><path d="M12 5h.01"></path><path d="M12 19h.01"></path></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Section des métadonnées - Toujours en dessous */}
                  <div data-slot="card-content" className="p-4">
                    <div className="flex items-start gap-2">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded border">
                        {bm.thumbnail ? (
                          <Image alt="favicon" className="opacity-100 transition-opacity duration-200 size-4" src={bm.thumbnail} width={16} height={16} />
                        ) : (
                          <span className="text-gray-500 text-xs">🌐</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 flex-1">
                        <div data-slot="card-title" className="font-semibold text-sm truncate">{bm.title}</div>
                        <div data-slot="card-description" className="text-muted-foreground text-sm line-clamp-1">{bm.description}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </span>
        )) : (bookmarks.map((bm) => (
          <span key={bm.id} data-state="closed" data-slot="context-menu-trigger">
            <div
              data-slot="card"
              className="bg-[#232526] text-white flex flex-col rounded-xl border border-gray-700 shadow-sm group w-full overflow-hidden p-0"
              data-testid="bookmark-card-page"
              onClick={(e) => {
                // Ne pas ouvrir le détail popup pour les bookmarks en erreur
                if (bm.status === 'error') return;
                
                e.preventDefault();
                setDetailPopup({
                  bookmark: bm,
                  visible: true,
                });
              }}
            >
              {bm.status === 'error' ? (
                <div data-slot="card-header" className="relative h-32 bg-gray-900 flex flex-col items-center justify-center p-3 overflow-hidden">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                    <span className="font-medium">Failed to Load</span>
                  </div>
                  <div className="w-full px-2 py-2 bg-gray-700 rounded-md text-xs text-gray-300 text-center truncate">{bm.url}</div>
                  <div className="flex justify-center gap-2 mt-3">
                    <button 
                      className="px-2 py-1 bg-green-600 text-white rounded-md text-xs hover:bg-green-700 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Supprimer ce bookmark en échec
                        const updatedBookmarks = bookmarks.filter(b => b.id !== bm.id);
                        setBookmarks(updatedBookmarks);
                        // Mettre l'URL dans l'input
                        setInputUrl(bm.url);
                        // Après un court délai, simuler un clic sur le bouton Add
                        setTimeout(() => {
                          const addButton = document.querySelector('[data-slot="button"]');
                          if (addButton) {
                            (addButton as HTMLElement).click();
                          }
                        }, 100);
                      }}
                    >Rebookmark</button>
                    <button 
                      className="px-2 py-1 bg-gray-600 text-white rounded-md text-xs hover:bg-gray-700 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Supprimer ce bookmark en échec
                        const updatedBookmarks = bookmarks.filter(b => b.id !== bm.id);
                        setBookmarks(updatedBookmarks);
                      }}
                    >Delete</button>
                  </div>
                </div>
              ) : (
                <>
                  <div data-slot="card-header" className="relative h-32 overflow-hidden">
                    <a href={"/app/b/" + bm.id} onClick={(e) => e.preventDefault()}>
                      {bm.thumbnail ? (
                        <Image alt={bm.title} src={bm.thumbnail} fill className="object-cover transition-all group-hover:scale-105" sizes="(max-width: 768px) 100vw, 300px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">No preview</div>
                      )}
                    </a>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-between p-3">
                      <div className="flex gap-1">
                        <button 
                          className="p-2 bg-black/50 rounded-full hover:bg-black/80 transition text-red-400 hover:text-red-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            // Supprimer le bookmark
                            setBookmarks((prev: Bookmark[]) => {
                              const newBookmarks = prev.filter((b: Bookmark) => b.id !== bm.id);
                              localStorage.setItem('saave_bookmarks', JSON.stringify(newBookmarks));
                              return newBookmarks;
                            });
                          }}
                          title="Delete bookmark"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>
                        <button 
                          className="p-2 bg-black/50 rounded-full hover:bg-black/80 transition text-blue-400 hover:text-blue-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            // Copier le lien
                            navigator.clipboard.writeText(bm.url);
                            
                            // Afficher un toast temporaire
                            const toast = document.createElement('div');
                            toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white py-2 px-4 rounded-md shadow-lg z-50 flex items-center gap-2';
                            toast.innerHTML = `
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
                              <span>Link copied!</span>
                            `;
                            document.body.appendChild(toast);
                            
                            // Supprimer le toast après 2 secondes
                            setTimeout(() => {
                              toast.remove();
                            }, 2000);
                          }}
                          title="Copy link"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
                        </button>
                      </div>
                      
                      <div className="flex gap-1">
                        <button 
                          className="p-2 bg-black/50 rounded-full hover:bg-black/80 transition"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(bm.url, '_blank');
                          }}
                          title="Open link"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>
                        </button>
                        <button 
                          className="p-2 bg-black/50 rounded-full hover:bg-black/80 transition"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              bookmark: bm,
                              visible: true
                            });
                          }}
                          title="More options"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12h.01"></path><path d="M12 5h.01"></path><path d="M12 19h.01"></path></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div data-slot="card-content" className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded border">
                        {bm.thumbnail ? (
                          <Image alt="favicon" className="opacity-100 transition-opacity duration-200 size-4" src={bm.thumbnail} width={16} height={16} />
                        ) : (
                          <span className="text-gray-500 text-xs">🌐</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 flex-1">
                        <div data-slot="card-title" className="font-semibold text-sm truncate">{bm.title}</div>
                        <div data-slot="card-description" className="text-muted-foreground text-sm line-clamp-1">{bm.description}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </span>
        ))))}        
        {contextMenu.visible && contextMenu.bookmark && (
          <BookmarkContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            bookmark={contextMenu.bookmark}
            onDelete={(bookmark) => {
              // Supprime effectivement le bookmark du state
              setBookmarks((prev: Bookmark[]) => prev.filter((b: Bookmark) => b.id !== bookmark.id));
              // Ferme le menu après un court délai pour éviter les problèmes de propagation d'événements
              setTimeout(() => {
                setContextMenu({ ...contextMenu, visible: false });
              }, 100);
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
              setBookmarks((prev: Bookmark[]) => prev.filter((b: Bookmark) => b.id !== bookmark.id));
            }}
            onOpen={() => {
              window.open(detailPopup.bookmark?.url, '_blank');
            }}
          />
        )}
      </div>
    </div>
  );
}
