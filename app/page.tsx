'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    const checkLanguagePreference = () => {
      // Prevent multiple navigation attempts
      if (hasNavigated) return;
      
      // Check if we're actually on the root path
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        return;
      }
      
      // Check localStorage first (user's saved preference)
      const savedLanguage = localStorage.getItem('uiLanguage');
      
      if (savedLanguage && ['ko', 'en'].includes(savedLanguage)) {
        const targetUrl = `/${savedLanguage}`;
        setHasNavigated(true);
        
        // Try router first, fallback to window.location if needed
        try {
          router.push(targetUrl);
        } catch (error) {
          console.log('⚠️ Router failed, using window.location');
          window.location.href = targetUrl;
        }
        return;
      }

      // Fallback to browser language detection
      const supportedLocales = ['ko', 'en'];
      const browserLanguages = navigator.languages || [navigator.language];
      
      for (const lang of browserLanguages) {
        const code = lang.split('-')[0].toLowerCase();
        if (supportedLocales.includes(code)) {
          setHasNavigated(true);
          router.push(`/${code}`);
          return;
        }
      }

      // Final fallback to default
      console.log('✅ Using default fallback: ko');
      setHasNavigated(true);
      router.push('/ko');
    };

    // Small delay to ensure localStorage is fully updated after navigation
    const timeoutId = setTimeout(() => {
      checkLanguagePreference();
      setIsChecking(false);
    }, 100);

    // Only add visibility change listener if we're on the root path
    let cleanupVisibilityListener: (() => void) | null = null;
    
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      // Listen for page visibility changes (when user comes back to tab)
      const handleVisibilityChange = () => {
        if (!document.hidden && !hasNavigated) {
          checkLanguagePreference();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      cleanupVisibilityListener = () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    return () => {
      clearTimeout(timeoutId);
      if (cleanupVisibilityListener) {
        cleanupVisibilityListener();
      }
    };
  }, [router, hasNavigated]);

  // Show loading while routing
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-gray-600">
          {isChecking ? 'Checking language preference...' : 'Loading...'}
        </p>
      </div>
    </div>
  );
} 