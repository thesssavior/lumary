"use client";

import { Button } from "@/components/ui/button";
import { signIn, signOut, useSession } from "next-auth/react";
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';

export function Navbar() {
  const t = useTranslations();
  const { data: session } = useSession();
  const locale = useLocale();
  return (
    <nav className="border-b border-zinc-200 bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href={`/${locale}`} className="flex items-center space-x-2">
          <Image src="/lumary-logo.png" alt="Lumary Logo" width={100} height={100} />
        </Link>

        <div className="flex items-center space-x-4">
          {session ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-zinc-600">
                {session.user?.name}
              </span>
              <Button
                variant="outline"
                onClick={() => signOut({ callbackUrl: `/${locale}` })}
                className="border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              >
                {t('signOut')}
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => signIn("google")}
              className="bg-black hover:bg-zinc-800 text-white"
            >
              {t('signIn')}
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
} 