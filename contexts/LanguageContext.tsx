'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocale } from 'next-intl';

interface LanguageContextType {
  preferredLocale: string;
  setLanguagePreference: (locale: string) => void;
  isLanguageReady: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const routeLocale = useLocale(); // Fallback to route-based locale
  const [preferredLocale, setPreferredLocale] = useState<string>(routeLocale);
  const [isLanguageReady, setIsLanguageReady] = useState(false);

  useEffect(() => {
    // Check localStorage for saved preference
    const savedLanguage = localStorage.getItem('uiLanguage');
    if (savedLanguage && ['ko', 'en'].includes(savedLanguage)) {
      setPreferredLocale(savedLanguage);
    } else {
      setPreferredLocale(routeLocale);
    }
    setIsLanguageReady(true);
  }, [routeLocale]);

  const setLanguagePreference = (locale: string) => {
    if (['ko', 'en'].includes(locale)) {
      localStorage.setItem('uiLanguage', locale);
      setPreferredLocale(locale);
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('languageChanged', { 
        detail: { language: locale } 
      }));
    }
  };

  const contextValue: LanguageContextType = {
    preferredLocale,
    setLanguagePreference,
    isLanguageReady,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
} 