"use client";

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
  small?: boolean;
}

export function Logo({ 
  width = 100, 
  height = 100, 
  className = "", 
  alt = "Lumary Logo",
  small = false
}: LogoProps) {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder with the same dimensions to prevent layout shift
    return (
      <div 
        style={{ width, height }} 
        className={`bg-transparent ${className}`}
        aria-hidden="true"
      />
    );
  }

  // Determine if we're in dark mode
  const isDark = (theme === 'system' ? systemTheme : theme) === 'dark';
  
  // Choose the appropriate logo
  const logoSrc = small ? (isDark ? '/small_white.png' : '/small.png') : (isDark ? '/lumary_white.png' : '/lumary.png');

  return (
    <Image 
      src={logoSrc} 
      alt={alt} 
      width={small ? width/3 : width} 
      height={small ? height/3 : height} 
      className={className}
      priority // Since this is likely above the fold
    />
  );
}
