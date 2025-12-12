import React from 'react';
import Image from 'next/image';
import { TextShimmer } from './ui/text-shimmer';

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
  const [isCancelling, setIsCancelling] = React.useState(false);
  if (currentStep === 'idle') return null;

  // Find the current step index
  const currentStepIndex = STEPS.findIndex(step => step.key === currentStep);
  const currentStepInfo = STEPS[currentStepIndex];
  const totalSteps = STEPS.length;
  const stepNumber = currentStepIndex >= 0 ? currentStepIndex + 1 : 0;
  
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
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-end p-4 sm:p-5">
      <div className="relative w-full max-w-md">
        <div className="absolute right-0 -top-3 flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-400/10 text-emerald-200 border border-emerald-400/30 shadow-sm shadow-emerald-900/40">
            {stepNumber > 0 ? `Step ${stepNumber}/${totalSteps}` : 'Processing'}
          </span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(52,211,153,0.12)] animate-pulse" />
        </div>

        <div className="rounded-2xl bg-[#0c1116]/90 border border-white/6 shadow-[0_20px_60px_rgba(0,0,0,0.55)] p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center shadow-[0_0_0_1px_rgba(52,211,153,0.15)]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <TextShimmer
                as="div"
                className="text-base font-semibold [--base-color:rgba(255,255,255,0.6)] [--base-gradient-color:#ffffff]"
                duration={1.2}
                spread={1.4}
              >
                {currentStepInfo?.label || 'Processing...'}
              </TextShimmer>
              <p className="text-xs text-slate-400 truncate">{title || domain || url}</p>
            </div>
          </div>

          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-white/70 via-white to-white transition-all duration-500 ease-out"
              style={{ width: `${Math.min(currentProgress * 100, 100)}%` }}
            />
          </div>

          {/* Bouton d'annulation minimaliste */}
          {onCancel && (
            <button
              onClick={async () => {
                if (isCancelling) return;
                setIsCancelling(true);
                try { await onCancel(); } catch {}
                setTimeout(() => setIsCancelling(false), 1500);
              }}
              disabled={isCancelling}
              className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 disabled:opacity-60 text-red-200 text-xs rounded-md transition-colors inline-flex items-center gap-1.5 border border-red-400/25"
            >
              {isCancelling ? (
                <>
                  <span className="inline-block w-2.5 h-2.5 rounded-full border border-red-200 border-t-transparent animate-spin"></span>
                  <span>Cancelling</span>
                </>
              ) : (
                'Cancel'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
