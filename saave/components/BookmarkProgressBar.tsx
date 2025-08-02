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

  // Find the current step index
  const currentStepIndex = STEPS.findIndex(step => step.key === currentStep);
  const currentStepInfo = STEPS[currentStepIndex];
  
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
    <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px] flex items-center justify-center p-2">
      <div className="w-full max-w-xs flex flex-col items-center">
        {/* Icône de l'étape actuelle - compacte */}
        <div className="w-12 h-12 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center mb-3 animate-pulse">
          <div className="w-6 h-6 rounded-full bg-green-400 flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
          </div>
        </div>
        
        {/* Nom de l'étape avec effet brillant - compact */}
        <div className="relative mb-3">
          <div className="text-sm font-semibold text-green-400 relative overflow-hidden text-center">
            {currentStepInfo?.label}
            {/* Effet brillant animé */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 animate-shine"></div>
          </div>
        </div>
        
        {/* Barre de progression globale - compacte */}
        <div className="w-full max-w-xs mb-2">
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${currentProgress * 100}%` }}
            >
              {/* Effet de brillant sur la barre */}
              <div className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
            </div>
          </div>
        </div>
        
        {/* Compteur d'étapes - compact */}
        <div className="text-xs text-gray-400 font-medium mb-3">
          Step {currentStepIndex + 1} of {STEPS.length}
        </div>

        {/* Bouton d'annulation - compact */}
        {onCancel && (
          <button 
            onClick={onCancel}
            className="px-2 py-1 bg-red-600/60 hover:bg-red-600/80 text-white text-xs rounded-md transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
