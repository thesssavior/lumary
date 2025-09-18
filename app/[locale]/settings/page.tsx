'use client'

import React, { useState, useTransition, useEffect, Suspense } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Crown, Layout, Grid, Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useFolder } from '@/components/home/SidebarLayout';
import { getLayoutPreference, setLayoutPreference } from '@/lib/utils';
import { LanguageSwitcher } from '@/components/home/LanguageSwitcher';

const SettingsPage = () => {
  const t = useTranslations('SettingsPage');
  const { data: session, status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false); // For delete account loading state
  const [layoutMode, setLayoutMode] = useState<'default' | 'split'>('default');
  const { openSubscriptionModal } = useFolder();
  const { theme, setTheme } = useTheme();

  // Load layout preference on component mount
  useEffect(() => {
    setLayoutMode(getLayoutPreference());
  }, []);

  const handleLanguageChange = (newLocale: string) => {
    // Save the preference to localStorage
    localStorage.setItem('uiLanguage', newLocale);
    
    startTransition(() => {
      router.replace(`/${newLocale}/settings`);
    });
  };

  const handleLayoutChange = (newLayoutMode: 'default' | 'split') => {
    setLayoutMode(newLayoutMode);
    setLayoutPreference(newLayoutMode);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: `/` });
  };

  const handleDeleteAccount = async () => {
    // TODO: Implement confirmation modal
    if (window.confirm(t('confirmDeleteAccount'))) {
      setIsDeleting(true);
      try {
        // Call API to delete account
        const response = await fetch('/api/home/user/delete', { method: 'DELETE' });
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
    <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
    <div className="space-y-8 max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-semibold mb-6">{t('title')}</h1>

      {/* Account Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('accountSection.title')}</CardTitle>
          <CardDescription>{t('accountSection.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">{t('accountSection.nameLabel')}</label>
            <p className="text-foreground break-all">{session.user?.name || t('accountSection.noName')}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">{t('accountSection.emailLabel')}</label>
            <p className="text-foreground break-all">{session.user?.email || t('accountSection.noEmail')}</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-row gap-2">
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
        <CardContent className="space-y-6">
          {/* Language Preference for UI */}
          <div>
            <label htmlFor="language-select" className="text-sm font-medium text-muted-foreground">
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

          {/* Language Preference for Content */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              {t('preferencesSection.contentLanguageLabel')}
            </div>
            <LanguageSwitcher />
            {isPending && <Loader2 className="mt-2 h-4 w-4 animate-spin" />}
          </div>

          {/* Layout Preference */}
          <div>
            <label htmlFor="layout-select" className="text-sm font-medium text-muted-foreground">
              {t('preferencesSection.modeLabel')}
            </label>
            <Select value={layoutMode} onValueChange={handleLayoutChange}>
              <SelectTrigger id="layout-select" className="w-full sm:w-[180px] mt-1">
                <SelectValue placeholder={t('preferencesSection.selectModePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  <div className="flex items-center gap-2">
                    <Layout className="h-4 w-4" />
                    {t('preferencesSection.defaultLayout')}
                  </div>
                </SelectItem>
                <SelectItem value="split">
                  <div className="flex items-center gap-2">
                    <Grid className="h-4 w-4" />
                    {t('preferencesSection.splitLayout')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1 p-2">
              {layoutMode === 'split' 
                ? t('preferencesSection.splitLayoutDescription') 
                : t('preferencesSection.defaultLayoutDescription')
              }
            </p>
          </div>

          {/* Theme Preference */}
          <div>
            <label htmlFor="theme-select" className="text-sm font-medium text-muted-foreground">
              {t('preferencesSection.themeLabel', { defaultValue: 'Theme' })}
            </label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="theme-select" className="w-full sm:w-[180px] mt-1">
                <SelectValue placeholder={t('preferencesSection.selectThemePlaceholder', { defaultValue: 'Select theme' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    {t('preferencesSection.lightTheme', { defaultValue: 'Light' })}
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    {t('preferencesSection.darkTheme', { defaultValue: 'Dark' })}
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    {t('preferencesSection.systemTheme', { defaultValue: 'System' })}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1 p-2">
              {t('preferencesSection.themeDescription', { defaultValue: 'Choose your preferred theme or sync with your system settings.' })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Manage Subscription Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('subscriptionSection.title', { defaultValue: 'Manage Subscription' })}</CardTitle>
          <CardDescription>{t('subscriptionSection.description', { defaultValue: 'View and manage your subscription details.' })}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* plan exists: free or premium */}
          {session?.user?.plan === 'premium' ? (
            <Button asChild>
              <a href="https://lumary.lemonsqueezy.com/billing" target="_blank" rel="noopener noreferrer">
                {t('subscriptionSection.manageButton', { defaultValue: 'Go to Billing' })}
              </a>
            </Button>
          ) : (
            <Button onClick={openSubscriptionModal}>
              <Crown className="mr-2 h-4 w-4" />
              {t('subscriptionSection.upgradeButton', { defaultValue: 'Upgrade to Premium' })}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Add more sections as needed, e.g., Theme, Notifications */}
    </div>
    </Suspense>
  );
};

export default SettingsPage;