'use client'

import React, { useState, useTransition } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const SettingsPage = () => {
  const t = useTranslations('SettingsPage');
  const { data: session, status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false); // For delete account loading state

  const handleLanguageChange = (newLocale: string) => {
    startTransition(() => {
      router.replace(`/${newLocale}/settings`);
    });
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: `/${locale}` });
  };

  const handleDeleteAccount = async () => {
    // TODO: Implement confirmation modal
    if (window.confirm(t('confirmDeleteAccount'))) {
      setIsDeleting(true);
      try {
        // Call API to delete account
        const response = await fetch('/api/user/delete', { method: 'DELETE' });
        if (response.ok) {
          await signOut({ callbackUrl: '/' }); // Sign out and redirect to home
        } else {
          const errorData = await response.json();
          alert(t('deleteAccountError', { error: errorData.error || 'Unknown error' }));
        }
      } catch (error) {
        console.error("Delete account error:", error);
        alert(t('deleteAccountError', { error: 'Client-side error' }));
      } finally {
        setIsDeleting(false);
      }
    }
  };

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!session) {
    // Optionally, redirect to sign-in or show a message
    // router.push('/signin'); // Example redirect
    return (
      <div className="text-center py-10">
        <p>{t('mustBeLoggedIn')}</p>
        {/* Optionally, add a sign-in button here */}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-semibold mb-6">{t('title')}</h1>

      {/* Account Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('accountSection.title')}</CardTitle>
          <CardDescription>{t('accountSection.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">{t('accountSection.nameLabel')}</label>
            <p className="text-gray-900 break-all">{session.user?.name || t('accountSection.noName')}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">{t('accountSection.emailLabel')}</label>
            <p className="text-gray-900 break-all">{session.user?.email || t('accountSection.noEmail')}</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleSignOut} variant="outline">
            {t('accountSection.signOutButton')}
          </Button>
          <Button 
            onClick={handleDeleteAccount} 
            variant="destructive" 
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('accountSection.deleteAccountButton')}
          </Button>
        </CardFooter>
      </Card>

      {/* Preferences Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('preferencesSection.title')}</CardTitle>
          <CardDescription>{t('preferencesSection.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="language-select" className="text-sm font-medium text-gray-700">
              {t('preferencesSection.languageLabel')}
            </label>
            <Select value={locale} onValueChange={handleLanguageChange} disabled={isPending}>
              <SelectTrigger id="language-select" className="w-full sm:w-[180px] mt-1">
                <SelectValue placeholder={t('preferencesSection.selectLanguagePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('preferencesSection.english')}</SelectItem>
                <SelectItem value="ko">{t('preferencesSection.korean')}</SelectItem>
              </SelectContent>
            </Select>
            {isPending && <Loader2 className="mt-2 h-4 w-4 animate-spin" />}
          </div>
        </CardContent>
      </Card>

      {/* Add more sections as needed, e.g., Theme, Notifications */}
    </div>
  );
};

export default SettingsPage;