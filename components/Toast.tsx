import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  // État pour gérer l'animation d'entrée et sortie
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Déclencher l'animation d'entrée après le montage
    const showTimeout = setTimeout(() => {
      setVisible(true);
    }, 50);

    // Déclencher l'animation de sortie et fermer après la durée spécifiée
    const hideTimeout = setTimeout(() => {
      setVisible(false);
      // Attendre la fin de l'animation avant de fermer
      setTimeout(onClose, 300);
    }, duration);

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(hideTimeout);
    };
  }, [duration, onClose]);

  // Couleurs en fonction du type de notification
  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600'
  }[type];

  // Icône en fonction du type de notification
  const icon = {
    success: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    ),
    error: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
    ),
    info: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    )
  }[type];

  return (
    <div 
      className={`fixed bottom-6 right-6 flex items-center p-4 rounded-md shadow-lg max-w-xs ${bgColor} text-white transform transition-all duration-300 ease-in-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="flex items-center">
        <div className="mr-3">
          {icon}
        </div>
        <p className="text-sm font-medium">{message}</p>
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
    <div className="fixed bottom-0 right-0 p-4 z-50">
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
