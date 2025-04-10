import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  const currentLocale = pathname?.split('/')[1] || 'ko';

  const switchLanguage = (locale: string) => {
    const currentPath = pathname?.split('/').slice(2).join('/') || '';
    router.replace(`/${locale}/${currentPath}`);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => switchLanguage('ko')}
        className={`px-3 py-1 rounded-md hover:bg-zinc-800 transition-colors flex items-center gap-2 border ${
          currentLocale === 'ko' 
            ? 'border-red-500 bg-zinc-800' 
            : 'border-zinc-700'
        }`}
      >
        {t('korean')}
        {currentLocale === 'ko' && <Check className="h-4 w-4 text-red-500" />}
      </button>
      <button
        onClick={() => switchLanguage('en')}
        className={`px-3 py-1 rounded-md hover:bg-zinc-800 transition-colors flex items-center gap-2 border ${
          currentLocale === 'en' 
            ? 'border-red-500 bg-zinc-800' 
            : 'border-zinc-700'
        }`}
      >
        {t('english')}
        {currentLocale === 'en' && <Check className="h-4 w-4 text-red-500" />}
      </button>
    </div>
  );
} 