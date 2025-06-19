import { NextIntlClientProvider, useMessages } from 'next-intl';
import { notFound } from 'next/navigation';
import '../globals.css';
import { Navbar } from '@/components/home/Navbar';
import SidebarLayout from '@/components/home/SidebarLayout';
import ServerDownModalProvider from '@/components/home/ServerDownModalProvider';
import ConditionalFooter from '@/components/ConditionalFooter';

// Add react-pdf CSS imports
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { SummaryGenerationProvider } from '@/contexts/SummaryGenerationContext';
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "next-auth/react";
import SearchProvider from '@/contexts/SearchContext';
import GlobalSearchModal from '@/components/GlobalSearchModal';

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
    <>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <SessionProvider>
          <SearchProvider>
            <SummaryGenerationProvider>
              <ServerDownModalProvider>
                <Navbar />
                <SidebarLayout>
                  <div className="container mx-auto px-4 py-8 bg-white min-h-screen">
                    {children}
                  </div>
                </SidebarLayout>
                <ConditionalFooter />
                <GlobalSearchModal />
              </ServerDownModalProvider>
            </SummaryGenerationProvider>
          </SearchProvider>
        </SessionProvider>
        <Toaster />
      </NextIntlClientProvider>
    </>
  );
}