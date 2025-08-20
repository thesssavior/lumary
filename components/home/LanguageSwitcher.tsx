'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ChevronDown, Globe } from 'lucide-react';

// Major languages with their codes and native names
const CONTENT_LANGUAGES = [
  { code: 'ko', name: '한국어', nativeName: '한국어' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
];

export function LanguageSwitcher() {
  const pathname = usePathname();
  const t = useTranslations();
  const currentLocale = pathname?.split('/')[1] || 'ko';
  
  const [contentLanguage, setContentLanguage] = useState<string>(currentLocale);
  const [isOpen, setIsOpen] = useState(false);

  // Load saved content language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('contentLanguage');
    if (savedLanguage && CONTENT_LANGUAGES.find(lang => lang.code === savedLanguage)) {
      setContentLanguage(savedLanguage);
    }
  }, []);

  // Save content language to localStorage when changed
  const handleContentLanguageChange = (languageCode: string) => {
    setContentLanguage(languageCode);
    localStorage.setItem('contentLanguage', languageCode);
    setIsOpen(false); // Close the dropdown after selection
    // Emit custom event to notify other components
    window.dispatchEvent(new CustomEvent('contentLanguageChanged', { 
      detail: { language: languageCode } 
    }));
  };

  const selectedLanguage = CONTENT_LANGUAGES.find(lang => lang.code === contentLanguage);

  return (
    <div className="flex items-center space-x-2">
      <Select
        value={contentLanguage}
        onValueChange={handleContentLanguageChange}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger className="w-120 border-border text-muted-foreground hover:bg-accent">
          <div className="flex items-center space-x-2">
            <Globe size={16} />
            <span className="mr-2">{selectedLanguage?.nativeName || 'Language'}</span>
          </div>
        </SelectTrigger>
        <SelectContent>
          {CONTENT_LANGUAGES.map((language) => (
            <SelectItem key={language.code} value={language.code}>
              <div className="flex items-center justify-between w-full">
                <span>{language.nativeName}</span>
                {language.name !== language.nativeName && (
                  <span className="text-xs text-zinc-500 ml-2">{language.name}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 