"use client";

import { Button } from "@/components/ui/button";
import { signIn, useSession } from "next-auth/react";
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { HelpCircle, LogIn, User } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useParams } from "next/navigation";

export function Navbar() {
  const t = useTranslations();
  const { data: session } = useSession();
  const params = useParams();
  const locale = params.locale as string;
  return (
    <>
      <nav className="border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4 sm:px-12">
          <Link href={`/${locale}`} className="flex items-center space-x-2 ml-12 sm:ml-6">
            <Logo width={100} height={100} small={true} />
          </Link>

          <div className="flex items-center space-x-4">
            <Link href={`/${locale}/community`}>
              <Button 
                variant="ghost" 
                title={t('helpAndCommunity')}
              >
                <span className="sm:hidden"><HelpCircle className="h-5 w-5" /></span>
                <span className="hidden sm:flex items-center space-x-2 gap-x-1">
                  {t('helpAndCommunity')}
                  <HelpCircle className="h-5 w-5" />
                </span>
              </Button>
            </Link>

            {session ? (
              <div className="flex items-center space-x-4">
                <Link href={`/${locale}/settings`}>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.user?.image ?? undefined} alt={session?.user?.name ?? 'User'} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                </Link>
              </div>
            ) : (
              <Button
                onClick={() => signIn("google")}
                className="bg-foreground hover:opacity-90 text-background"
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
    </>
  );
} 