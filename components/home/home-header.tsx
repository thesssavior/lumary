"use client";

import { useTranslations } from 'next-intl';
interface HomeHeaderProps {
  locale: string;
}

export function HomeHeader({ locale }: HomeHeaderProps) {
  const t = useTranslations();
  
  return (
    <>
      <h1 className="text-4xl font-bold text-center mb-2">
        {t('title')}
      </h1>
      <p className="text-muted-foreground text-center mb-12">
        {t('subtitle')}
      </p>
    </>
  );
} 