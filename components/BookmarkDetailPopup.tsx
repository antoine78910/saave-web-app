import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Bookmark } from './BookmarkGrid';

interface BookmarkDetailPopupProps {
  bookmark: Bookmark;
  onClose: () => void;
  onDelete: (bookmark: Bookmark) => void;
  onOpen: () => void;
}

export default function BookmarkDetailPopup({ bookmark, onClose, onDelete, onOpen }: BookmarkDetailPopupProps) {
  // Initialiser les notes personnelles à partir du bookmark ou chaîne vide
  const [personalNote, setPersonalNote] = useState(bookmark.personalNotes || '');
  // État pour indiquer quand la sauvegarde est en cours
  const [isSaving, setIsSaving] = useState(false);
  // État pour suivre si l'utilisateur est en train d'écrire
  const [isTyping, setIsTyping] = useState(false);
  
  // Fonction pour sauvegarder manuellement les notes
  const savePersonalNote = async () => {
    if (personalNote !== bookmark.personalNotes) {
      setIsSaving(true);
      try {
        // Récupérer les bookmarks actuels
        const savedBookmarks = localStorage.getItem('saave_bookmarks');
        if (savedBookmarks) {
          const bookmarks = JSON.parse(savedBookmarks);
          
          // Mettre à jour les notes du bookmark actuel
          const updatedBookmarks = bookmarks.map((bm: typeof bookmark) => {
            if (bm.id === bookmark.id) {
              return { ...bm, personalNotes: personalNote };
            }
            return bm;
          });
          
          // Sauvegarder dans localStorage
          localStorage.setItem('saave_bookmarks', JSON.stringify(updatedBookmarks));
          
          // Afficher l'indicateur de sauvegarde pendant un court instant
          setTimeout(() => setIsSaving(false), 500);
        }
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des notes personnelles:', error);
        setIsSaving(false);
      }
    }
  };
  
  // S'assurer que les tags existent, sinon utiliser un tableau vide
  const tags = bookmark.tags || [];
  
  // Détection des arrêts d'écriture avec sauvegarde immédiate
  useEffect(() => {
    if (personalNote !== bookmark.personalNotes) {
      setIsTyping(true);
      const typingTimer = setTimeout(() => {
        setIsTyping(false);
        setIsSaving(true);
      }, 100); // 100ms seulement - sauvegarde quasi-instantanée
      
      return () => clearTimeout(typingTimer);
    }
  }, [personalNote, bookmark.personalNotes]);
  
  // Sauvegarder automatiquement les notes personnelles
  useEffect(() => {
    // Ne sauvegarde que si l'utilisateur a arrêté d'écrire et que les notes ont changé
    if (!isTyping && personalNote !== bookmark.personalNotes) {
      const saveNote = async () => {
        try {
          // Indiquer que la sauvegarde est en cours
          setIsSaving(true);
          
          // Récupérer les bookmarks actuels
          const savedBookmarks = localStorage.getItem('saave_bookmarks');
          if (savedBookmarks) {
            const bookmarks = JSON.parse(savedBookmarks);
            
            // Mettre à jour les notes du bookmark actuel
            const updatedBookmarks = bookmarks.map((bm: typeof bookmark) => {
              if (bm.id === bookmark.id) {
                return { ...bm, personalNotes: personalNote };
              }
              return bm;
            });
            
            // Sauvegarder dans localStorage
            localStorage.setItem('saave_bookmarks', JSON.stringify(updatedBookmarks));
            
            // Pas de délai artificiel, sauvegarde instantanée
            // Note: on garde l'indicateur de sauvegarde visible un tout petit moment pour le feedback utilisateur
            setTimeout(() => setIsSaving(false), 50);
          }
        } catch (error) {
          console.error('Erreur lors de la sauvegarde des notes personnelles:', error);
        } finally {
          // Désactiver l'indicateur de sauvegarde
          setIsSaving(false);
        }
      };
      
      // Exécuter immédiatement la sauvegarde sans attendre
      saveNote();
    }
  }, [isTyping, personalNote, bookmark.personalNotes, bookmark.id]);
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-gray-900 rounded-lg border border-gray-700 shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with icons */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div className="flex-1"></div>
          <div className="flex gap-2">
            <button className="p-2 rounded hover:bg-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
            </button>
            <button className="p-2 rounded hover:bg-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>
            </button>
            <button className="p-2 rounded hover:bg-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path></svg>
            </button>
            <button className="p-2 rounded hover:bg-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"></path><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path></svg>
            </button>
            <button className="p-2 rounded hover:bg-gray-700" onClick={onClose}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            </button>
          </div>
        </div>
        
        {/* URL et titre */}
        <div className="p-4 border-b border-gray-700 bg-gray-850">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
              {bookmark.thumbnail ? (
                <Image alt="favicon" src={bookmark.thumbnail} width={20} height={20} className="rounded-full" />
              ) : (
                <span className="text-gray-400">🌐</span>
              )}
            </div>
            <div>
              <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white text-sm">{bookmark.url}</a>
              <h2 className="font-medium text-lg text-white">{bookmark.title}</h2>
            </div>
          </div>
        </div>
        
        {/* Résumé */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
            <h3 className="font-medium text-green-500">Summary</h3>
          </div>
          <div className="bg-gray-800 p-4 rounded-md shadow-md">
            <p className="text-sm text-gray-300">{bookmark.summary || bookmark.description || 'Aucun résumé disponible'}</p>
          </div>
        </div>
        
        {/* Capture d'écran */}
        <div className="p-4 border-b border-gray-700 bg-gray-850">
          <div className="flex items-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
            <h3 className="font-medium text-green-500">Screenshot</h3>
          </div>
          <div className="w-full h-64 relative bg-gray-800 rounded-md overflow-hidden">
            {bookmark.thumbnail ? (
              <Image 
                alt={bookmark.title} 
                src={bookmark.thumbnail} 
                fill 
                className="object-contain" 
                sizes="(max-width: 768px) 100vw, 768px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-500">Aucune capture d&apos;écran disponible</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Tags */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"></path><path d="M7 7h.01"></path></svg>
            <h3 className="font-medium text-green-500">Tags</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.length > 0 ? (
              <>
                <div className="text-xs text-gray-400 bg-gray-800 py-1 px-2 rounded-md shadow-sm">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
                  AI Generated
                </div>
                {tags.map((tag, index) => (
                  <div key={index} className="text-xs text-gray-300 bg-gray-800 py-1 px-2 rounded-md shadow-sm">
                    <span className="inline-block w-2 h-2 rounded-full bg-gray-500 mr-1.5"></span>
                    {tag}
                  </div>
                ))}
              </>
            ) : (
              <span className="text-gray-500 text-sm">Aucun tag disponible</span>
            )}
          </div>
        </div>
        
        {/* Notes personnelles */}
        <div className="p-4 border-b border-gray-700 bg-gray-850">
          <div className="flex items-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            <h3 className="font-medium text-green-500">Personal Notes</h3>
            {isSaving && (
              <span className="text-xs text-green-400 animate-pulse flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                saving...
              </span>
            )}
          </div>
          <div className="bg-gray-800 rounded-md p-1 shadow-md">
            <div className="relative">
              <textarea
                className="w-full bg-gray-800 text-white border-0 focus:ring-1 focus:ring-green-500 outline-none rounded-md p-3 min-h-[80px] placeholder-gray-500"
                placeholder="Add your personal notes about this bookmark..."
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                onBlur={() => {
                  if (personalNote !== bookmark.personalNotes) {
                    setIsTyping(false);
                    setIsSaving(true);
                  }
                }}
              />
              <button 
                onClick={savePersonalNote}
                disabled={isSaving || personalNote === bookmark.personalNotes}
                className={`absolute bottom-3 right-3 px-3 py-1 text-sm rounded-md ${isSaving || personalNote === bookmark.personalNotes ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Boutons d'action */}
        <div className="flex justify-end p-4 gap-2">
          <button 
            onClick={() => {
              onDelete(bookmark);
              onClose();
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            Delete
          </button>
          <button 
            onClick={onOpen}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>
            Open
          </button>
        </div>
      </div>
    </div>
  );
}
