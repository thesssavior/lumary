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
import { Providers } from '@/components/providers';
import React, { Suspense } from 'react';

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

  // Default layout for all other pages
  return (
    <Providers>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Seoul">
        <SessionProvider>
          <SearchProvider>
            <SummaryGenerationProvider>
              <ServerDownModalProvider>
                <div>
                  <SidebarLayout>
                    <Suspense fallback={<div className="flex justify-center items-center h-32">Loading...</div>}>
                      <div className="bg-background text-foreground min-h-screen">
                        <Navbar />
                        {children}
                      </div>
                    </Suspense>
                  </SidebarLayout>
                  <ConditionalFooter />
                </div>
                <GlobalSearchModal />
              </ServerDownModalProvider>
            </SummaryGenerationProvider>
          </SearchProvider>
        </SessionProvider>
        <Toaster />
      </NextIntlClientProvider>
    </Providers>
  );
} 