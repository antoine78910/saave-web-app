import React from 'react';
import Image from 'next/image';

export type BookmarkProcessStep = 
  | 'idle'
  | 'scraping' 
  | 'metadata' 
  | 'screenshot' 
  | 'describe' 
  | 'summary' 
  | 'tags' 
  | 'saving' 
  | 'finished'
  | 'error';

interface StepInfo {
  key: BookmarkProcessStep;
  label: string;
}

interface BookmarkProgressBarProps {
  currentStep: BookmarkProcessStep;
  url: string;
  domain?: string;
  title?: string;
  favicon?: string | null;
  thumbnail?: string | null;
  onCancel?: () => void;
}

const STEPS: StepInfo[] = [
  { key: 'scraping', label: 'Scraping content' },
  { key: 'metadata', label: 'Extracting metadata' },
  { key: 'screenshot', label: 'Taking screenshot' },
  { key: 'describe', label: 'Describing screenshot' },
  { key: 'summary', label: 'Summarizing page' },
  { key: 'tags', label: 'Finding relevant tags' },
  { key: 'saving', label: 'Saving' },
  { key: 'finished', label: 'Finished' }
];

export default function BookmarkProgressBar({ currentStep, url, domain, title, favicon, thumbnail, onCancel }: BookmarkProgressBarProps) {
  if (currentStep === 'idle') return null;
  
  if (currentStep === 'error') {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-[#232526] rounded-lg border border-gray-700 shadow-xl max-w-md w-full p-6">
          <div className="text-red-500 mb-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></svg>
            Error
          </div>
          <p className="text-white mb-4">Failed to process bookmark. Please try again later.</p>
          <button 
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 w-full"
            onClick={() => onCancel ? onCancel() : window.location.reload()}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Find the current step index
  const currentStepIndex = STEPS.findIndex(step => step.key === currentStep);
  const currentStepInfo = STEPS[currentStepIndex];

  // Déterminer quelles informations afficher en fonction de l'étape actuelle
  const showTitle = currentStep === 'metadata' || currentStep === 'screenshot' || currentStep === 'describe' || 
                   currentStep === 'summary' || currentStep === 'tags' || currentStep === 'saving' || currentStep === 'finished';
  
  const showFavicon = showTitle && favicon;
  const showThumbnail = currentStep === 'screenshot' || currentStep === 'describe' || 
                       currentStep === 'summary' || currentStep === 'tags' || currentStep === 'saving' || currentStep === 'finished';
  
  // Calculer la largeur de la progression
  const progressSteps = [
    { key: 'scraping', position: 0.15 },
    { key: 'metadata', position: 0.3 },
    { key: 'screenshot', position: 0.45 },
    { key: 'describe', position: 0.6 },
    { key: 'summary', position: 0.75 },
    { key: 'tags', position: 0.9 },
    { key: 'saving', position: 0.95 },
    { key: 'finished', position: 1.0 }
  ];
  
  const currentProgress = progressSteps.find(s => s.key === currentStep)?.position || 0;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#232526] rounded-lg border border-gray-700 shadow-xl max-w-md w-full overflow-hidden">
        {/* Barre de progression en haut */}
        <div className="relative h-1 w-full bg-gray-700">
          <div 
            className="absolute top-0 left-0 h-1 bg-amber-500" 
            style={{ width: `${currentProgress * 100}%` }}
          ></div>
        </div>
        
        {/* Prévisualisation du bookmark */}
        <div className="p-0">
          {/* Zone de thumbnail/screenshot */}
          <div className="aspect-video bg-gray-800 relative flex items-center justify-center">
            {showThumbnail && thumbnail ? (
              <div className="relative w-full h-full">
                <Image 
                  src={thumbnail} 
                  alt="Screenshot" 
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover" 
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 h-full w-full">
                {/* Icône de chargement animée */}
                <div className="animate-spin mb-3">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="text-gray-400"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  </svg>
                </div>
                
                {/* Texte de l'étape actuelle */}
                <div className="text-gray-300 text-sm flex items-center">
                  <span>{currentStepInfo?.label}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Informations du bookmark */}
          <div className="p-4">
            <div className="flex items-center">
              {showFavicon && (
                <div className="mr-2 w-6 h-6 flex-shrink-0 relative">
                  <Image 
                    src={favicon || ''} 
                    alt="Favicon" 
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                {showTitle ? (
                  <h3 className="text-white font-medium text-base truncate">{title || domain}</h3>
                ) : (
                  <div className="h-5 bg-gray-700 rounded animate-pulse w-3/4"></div>
                )}
                
                <p className="text-gray-400 text-xs truncate">{domain || url}</p>
              </div>
            </div>
          </div>
          
          {/* Bouton d'annulation */}
          <div className="p-4 pt-0">
            <button 
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 w-full"
              onClick={() => onCancel ? onCancel() : window.location.reload()}
            >
              Stop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
