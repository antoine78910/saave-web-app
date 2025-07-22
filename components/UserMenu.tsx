"use client";

import { useState } from 'react';

interface UserMenuProps {
  userEmail: string;
  onSignOut: () => void;
}

export default function UserMenu({ userEmail, onSignOut }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors bg-[#232526] px-3 py-2 rounded-lg border border-gray-600 hover:border-accent"
      >
        <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center text-xs font-bold text-white">
          {userEmail.charAt(0).toUpperCase()}
        </div>
        <span className="hidden sm:block">{userEmail}</span>
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
              <p className="text-sm text-gray-300">Signed in as</p>
              <p className="text-sm font-medium text-white truncate">{userEmail}</p>
            </div>
            
            <div className="py-1">
              <button
                onClick={() => {
                  window.location.href = '/upgrade';
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