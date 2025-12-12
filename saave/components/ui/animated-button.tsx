'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedButtonProps {
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  width?: string;
  height?: string;
  fontSize?: string;
  // Props ignorées mais gardées pour compatibilité si besoin
  children?: React.ReactNode;
  variant?: string;
}

export function AnimatedButton({ 
  onClick, 
  className,
  disabled = false,
  width = '100px',
  height = '36px',
  fontSize = '0.875rem'
}: AnimatedButtonProps) {
  return (
    <div className={cn('animated-button-wrapper', className)}>
      <button
        onClick={onClick}
        disabled={disabled}
        className="animated-button-exact"
        style={{
          width,
          height,
          fontSize,
        }}
      >
        <span className="span-mother">
          <span>G</span>
          <span>e</span>
          <span>t</span>
          <span>&nbsp;</span>
          <span>s</span>
          <span>t</span>
          <span>a</span>
          <span>r</span>
          <span>t</span>
          <span>e</span>
          <span>d</span>
        </span>
        <span className="span-mother2">
          <span>G</span>
          <span>e</span>
          <span>t</span>
          <span>&nbsp;</span>
          <span>s</span>
          <span>t</span>
          <span>a</span>
          <span>r</span>
          <span>t</span>
          <span>e</span>
          <span>d</span>
        </span>
      </button>
    </div>
  );
}
