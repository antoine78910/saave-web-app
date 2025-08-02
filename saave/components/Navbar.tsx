"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

interface ProcessingIndicatorProps {
  isProcessing: boolean;
  onCancel?: () => void;
  status?: 'processing' | 'cancelled' | 'completed';
}

function ProcessingIndicator({ isProcessing, onCancel, status = 'processing' }: ProcessingIndicatorProps) {
  if (!isProcessing && status !== 'cancelled') return null;
  
  const getIndicatorColor = () => {
    switch (status) {
      case 'cancelled': return 'text-green-500';
      case 'completed': return 'text-green-500';
      default: return 'text-amber-500';
    }
  };
  
  const getIndicatorIcon = () => {
    if (status === 'cancelled' || status === 'completed') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
      );
    }
    
    return (
      <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
      </svg>
    );
  };
  
  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800 border border-gray-600">
      <div className={getIndicatorColor()}>
        {getIndicatorIcon()}
      </div>
      <span className="text-sm text-gray-300">
        {status === 'cancelled' ? 'Cancelled' : status === 'completed' ? 'Completed' : 'Processing...'}
      </span>
      {status === 'processing' && onCancel && (
        <button 
          onClick={onCancel}
          className="text-gray-400 hover:text-red-400 transition-colors"
          title="Cancel processing"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18"></path>
            <path d="M6 6l12 12"></path>
          </svg>
        </button>
      )}
    </div>
  );
}



interface NavbarProps {
  processingBookmarks?: Set<string>;
  onCancelProcessing?: () => void;
  isProcessing?: boolean;
}

const Navbar = ({ 
  processingBookmarks = new Set(), 
  onCancelProcessing, 
  isProcessing = false
}: NavbarProps) => {
  const [indicatorStatus, setIndicatorStatus] = useState<'processing' | 'cancelled' | 'completed'>('processing');
  const isCurrentlyProcessing = processingBookmarks.size > 0 || isProcessing;
  
  // Reset status when processing starts
  useEffect(() => {
    if (isCurrentlyProcessing) {
      setIndicatorStatus('processing');
    }
  }, [isCurrentlyProcessing]);
  
  const handleCancel = () => {
    setIndicatorStatus('cancelled');
    if (onCancelProcessing) {
      onCancelProcessing();
    }
    
    // Hide the indicator after 2 seconds
    setTimeout(() => {
      setIndicatorStatus('processing');
    }, 2000);
  };
  
  return (
    <header className="sticky top-0 z-40 w-full border-b border-b-[hsl(var(--border))] bg-[hsl(var(--background))]">
      <div className="container flex h-16 items-center px-4 sm:px-8">
        <Link href="/" className="flex items-center">
          <div className="relative h-24 w-40">
            <Image 
              src="/logo.png" 
              alt="Saave Logo" 
              fill
              priority
              className="object-contain"
            />
          </div>
        </Link>
        
        <div className="flex-1" />
        
        {/* Indicateur de traitement */}
        <ProcessingIndicator 
          isProcessing={isCurrentlyProcessing || indicatorStatus === 'cancelled'}
          onCancel={handleCancel}
          status={indicatorStatus}
        />
        
        <nav className="flex items-center gap-6 ml-4">
          <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
            Home
          </Link>
          <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors scroll-smooth">
            Pricing
          </Link>
          <Link 
            href="/auth" 
            className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/90] text-[hsl(var(--primary-foreground))] px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Sign In
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
