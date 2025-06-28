'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check localStorage first (user's saved preference)
    const savedLanguage = localStorage.getItem('uiLanguage');
    if (savedLanguage && ['ko', 'en'].includes(savedLanguage)) {
      router.replace(`/${savedLanguage}`);
      return;
    }

    // Fallback to browser language detection
    const supportedLocales = ['ko', 'en'];
    const browserLanguages = navigator.languages || [navigator.language];
    
    for (const lang of browserLanguages) {
      const code = lang.split('-')[0].toLowerCase();
      if (supportedLocales.includes(code)) {
        router.replace(`/${code}`);
        return;
      }
    }

    // Final fallback to default
    router.replace('/ko');
  }, [router]);

  // Show loading while routing
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    </div>
  );
} 