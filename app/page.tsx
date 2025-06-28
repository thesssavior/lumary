'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkLanguagePreference = () => {
      console.log('🔍 Checking language preference...');
      
      // Check localStorage first (user's saved preference)
      const savedLanguage = localStorage.getItem('uiLanguage');
      console.log('💾 Saved language in localStorage:', savedLanguage);
      
      if (savedLanguage && ['ko', 'en'].includes(savedLanguage)) {
        console.log('✅ Using saved preference:', savedLanguage);
        const targetUrl = `/${savedLanguage}`;
        console.log('🚀 Navigating to:', targetUrl);
        
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
      console.log('🌐 Browser languages:', browserLanguages);
      
      for (const lang of browserLanguages) {
        const code = lang.split('-')[0].toLowerCase();
        if (supportedLocales.includes(code)) {
          console.log('✅ Using browser language:', code);
          router.push(`/${code}`);
          return;
        }
      }

      // Final fallback to default
      console.log('✅ Using default fallback: ko');
      router.push('/ko');
    };

    // Small delay to ensure localStorage is fully updated after navigation
    const timeoutId = setTimeout(() => {
      checkLanguagePreference();
      setIsChecking(false);
    }, 100);

    // Listen for page visibility changes (when user comes back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Page became visible, re-checking language preference');
        checkLanguagePreference();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]);

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