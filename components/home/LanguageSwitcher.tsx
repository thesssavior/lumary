import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';

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
    <div className="flex items-center space-x-2">
      <Button
        variant={currentLocale === 'ko' ? 'default' : 'outline'}
        onClick={() => switchLanguage('ko')}
        className={currentLocale === 'ko' ? 'bg-black text-white hover:bg-zinc-800' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}
      >
        {t('korean')}
      </Button>
      <Button
        variant={currentLocale === 'en' ? 'default' : 'outline'}
        onClick={() => switchLanguage('en')}
        className={currentLocale === 'en' ? 'bg-black text-white hover:bg-zinc-800' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}
      >
        {t('english')}
      </Button>
    </div>
  );
} 