"use client";

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const styles = {
    success: {
      accent: 'bg-emerald-400',
      icon: '✓',
    },
    error: {
      accent: 'bg-rose-400',
      icon: '✕',
    },
    info: {
      accent: 'bg-sky-400',
      icon: 'ℹ',
    },
  }[type];

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0b0f12]/95 text-white px-4 py-3 shadow-[0_15px_50px_rgba(0,0,0,0.45)] min-w-[260px] max-w-[360px] backdrop-blur-md animate-slide-in-right">
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0.08))' }} />
      <div className="flex items-start gap-3 pl-2">
        <div className={`flex-shrink-0 w-7 h-7 ${styles.accent} rounded-full flex items-center justify-center text-sm font-bold text-black shadow-[0_0_0_6px_rgba(255,255,255,0.04)]`}>
          {styles.icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold leading-5">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 w-7 h-7 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// Gestionnaire de toasts
export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

interface ToastManagerProps {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

export function ToastManager({ toasts, removeToast }: ToastManagerProps) {
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-3 z-50">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
          duration={toast.duration}
        />
      ))}
    </div>
  );
}
