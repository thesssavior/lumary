'use client';

import { NextIntlClientProvider } from 'next-intl';
import { Navbar } from '@/components/home/Navbar';
import SidebarLayout from '@/components/home/SidebarLayout';
import ServerDownModalProvider from '@/components/home/ServerDownModalProvider';
import ConditionalFooter from '@/components/ConditionalFooter';
import { SummaryGenerationProvider } from '@/contexts/SummaryGenerationContext';
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "next-auth/react";
import SearchProvider from '@/contexts/SearchContext';
import GlobalSearchModal from '@/components/GlobalSearchModal';
import { ClientProvider } from '@/components/providers';
import { usePathname } from 'next/navigation';

interface ClientLayoutWrapperProps {
  children: React.ReactNode;
  locale: string;
  messages: any;
}

export function ClientLayoutWrapper({ 
  children, 
  locale, 
  messages 
}: ClientLayoutWrapperProps) {
  const pathname = usePathname();
  
  // Check if we're on a summary page which needs a different layout
  const isSummaryPage = pathname?.includes('/summaries/');

  if (isSummaryPage) {
    return (
      <ClientProvider>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SessionProvider>
            <SearchProvider>
              <SummaryGenerationProvider>
                <div className="flex flex-col h-screen">
                  <Navbar />
                  <main className="flex-1 overflow-y-auto">
                    {children}
                  </main>
                </div>
              </SummaryGenerationProvider>
            </SearchProvider>
          </SessionProvider>
          <Toaster />
        </NextIntlClientProvider>
      </ClientProvider>
    );
  }

  // Default layout for all other pages
  return (
    <ClientProvider>
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
    </ClientProvider>
  );
} 