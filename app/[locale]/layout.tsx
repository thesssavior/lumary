import { notFound } from 'next/navigation';
import '../globals.css';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Add react-pdf CSS imports
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ClientLayoutWrapper } from '@/components/ClientLayoutWrapper';

export function generateStaticParams() {
  return [
    { locale: 'ko' },
    { locale: 'en' }
  ];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const { locale = 'ko' } = resolvedParams;

  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch (error) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="flex justify-center items-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <ClientLayoutWrapper locale={locale} messages={messages}>
        {children}
      </ClientLayoutWrapper>
    </Suspense>
  );
}