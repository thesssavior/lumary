"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { signIn, signOut, useSession } from "next-auth/react";
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { HelpCircle, LogIn, LogOut } from 'lucide-react';
import { ReportModal } from './report-modal';

export function Navbar() {
  const t = useTranslations();
  const { data: session } = useSession();
  const locale = useLocale();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  return (
    <>
      <nav className="border-b border-zinc-200 bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href={`/${locale}`} className="flex items-center space-x-2">
            <Image src="/lumary-logo.png" alt="Lumary Logo" width={100} height={100} />
          </Link>

          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => setIsReportModalOpen(true)}
              title={t('getHelp') || 'Get Help'}
            >
              <span className="sm:hidden"><HelpCircle className="h-5 w-5" /></span>
              <span className="hidden sm:flex items-center space-x-2 gap-x-1">
                {t('getHelp') || 'Get Help'}
                <HelpCircle className="h-5 w-5" />
              </span>
            </Button>
            
            {session ? (
              <div className="flex items-center space-x-4">
                <span className="hidden sm:inline text-sm text-zinc-600">
                  {session.user?.name}
                </span>
                <Button
                  variant="outline"
                  onClick={() => signOut({ callbackUrl: `/${locale}` })}
                  className="border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  title={t('signOut')}
                >
                  <span className="sm:hidden"><LogOut className="h-5 w-5" /></span>
                  <span className="hidden sm:flex items-center space-x-2 gap-x-1">
                    {t('signOut')}
                    <LogOut className="h-5 w-5" />
                  </span>
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => signIn("google")}
                className="bg-black hover:bg-zinc-800 text-white"
                title={t('signIn')}
              >
                <span className="sm:hidden"><LogIn className="h-5 w-5" /></span>
                <span className="hidden sm:flex items-center space-x-2 gap-x-1">
                  {t('signIn')}
                  <LogIn className="h-5 w-5" />
                </span>
              </Button>
            )}
          </div>
        </div>
      </nav>
      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
    </>
  );
} 