"use client";

import { useState } from 'react';

interface UserMenuProps {
  userEmail: string;
  displayName?: string;
  onSignOut: () => void;
  isPro?: boolean;
}

export default function UserMenu({ userEmail, displayName, onSignOut, isPro }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {isPro && (
        <div
          className="absolute -top-2 -right-2 bg-green-600 text-white rounded-full px-2 py-0.5 text-[10px] font-bold shadow flex items-center gap-1"
          aria-label="Saave Pro"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-3.5 h-3.5"
          >
            <path d="M12 4l2.6 4.2L20 8l-4 3-1 5-3-2-3 2-1-5-4-3 5.4-.8L12 4z" />
          </svg>
          Pro
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors bg-[#232526] px-3 py-2 rounded-lg border border-gray-600 hover:border-accent"
      >
        <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center text-xs font-bold text-white">
          {(displayName || userEmail).charAt(0).toUpperCase()}
        </div>
        <span className="hidden sm:block">{displayName || userEmail}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Overlay pour fermer le menu en cliquant à côté */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu dropdown */}
          <div className="absolute right-0 mt-2 w-56 bg-[#232526] border border-gray-600 rounded-lg shadow-lg z-20">
            <div className="p-3 border-b border-gray-600">
              <p className="text-sm text-gray-300">Connecté en tant que</p>
              <p className="text-sm font-medium text-white truncate">{displayName || userEmail}</p>
              {displayName && (
                <p className="text-xs text-gray-400 truncate">{userEmail}</p>
              )}
            </div>
            
            <div className="py-1">
              <button
                onClick={() => {
                  window.location.href = '/account';
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2c2c2c] hover:text-white transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Mon compte
              </button>
              <button
                onClick={() => {
                  window.location.href = '/account';
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2c2c2c] hover:text-white transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Billing & Subscription
              </button>
              
              <button
                onClick={() => {
                  window.open('https://saave.canny.io/feature-requests', '_blank');
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2c2c2c] hover:text-white transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Feature Requests
              </button>
              
              <button
                onClick={() => {
                  onSignOut();
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2c2c2c] hover:text-white transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 