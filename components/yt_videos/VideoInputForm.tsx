"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { YoutubeIcon, AlertCircle, X, Loader2 } from "lucide-react";
import { useTranslations } from 'next-intl';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from "next-auth/react";
import { useFolder } from '../home/SidebarLayout';
import { useSummaryGeneration } from '@/contexts/SummaryGenerationContext';
import { LanguageSwitcher } from '../home/LanguageSwitcher';
import { useHydration } from '@/hooks/useHydration';
import { useDevMode } from '@/hooks/useDevMode';

interface FolderType {
  id: string;
  name: string;
}

export function VideoInputForm() {
  const t = useTranslations();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = params.locale as string;
  const { activeFolder, openSubscriptionModal } = useFolder();
  const { setGenerationData } = useSummaryGeneration();
  const isHydrated = useHydration();
  const isDevMode = useDevMode();
  
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { data: session } = useSession();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [trialUsed, setTrialUsed] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [showTokenLimitUpgrade, setShowTokenLimitUpgrade] = useState(false);
  const [dailyLimitExceeded, setDailyLimitExceeded] = useState(false);

  // Check localStorage for trial status on mount - only after hydration
  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      const storedTrialUsed = localStorage.getItem('trialUsed');
      if (storedTrialUsed === 'true') {
        setTrialUsed(true);
      }
    }
  }, [isHydrated]);

  // Extract video ID from URL passed as query param
  useEffect(() => {
    const youtubeParam = searchParams.get('youtube');
    if (youtubeParam) {
      try {
        setUrl(decodeURIComponent(youtubeParam));
      } catch {
        setUrl(youtubeParam); // fallback if decoding fails
      }
    }
  }, [searchParams]);

  // Check if the user is using an in-app browser - only after hydration
  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      const ua = navigator.userAgent || navigator.vendor;
      if (/KAKAOTALK/i.test(ua)) {
        setInAppBrowser(true);
      } else {
        setInAppBrowser(false);
      }
    }
  }, [isHydrated]);

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/, // eslint-disable-line no-useless-escape
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/, // YouTube Shorts support
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShowTokenLimitUpgrade(false);
    setDailyLimitExceeded(false);

    if (!session && trialUsed) {
      setShowLoginPrompt(true);
      return;
    }
    
    // Check daily limit for signed-in free users - only after hydration
    if (session && session.user.plan !== 'premium' && isHydrated && typeof window !== 'undefined') {
      const today = new Date().toDateString();
      const lastGenerationDate = localStorage.getItem('freeUserLastGenerationDate');

      if (lastGenerationDate === today) {
        setDailyLimitExceeded(true);
        setError(t('dailyLimitExceededError'));
        setIsLoading(false);
        return;
      }
    }
    
    setIsLoading(true);

    try {
      const videoId = extractVideoId(url);
      if (!videoId) {
        throw new Error(t('error') + ": " + t('invalidUrl'));
      }

      // Get content language from LanguageSwitcher (localStorage), fallback to UI locale
      const contentLanguage = typeof window !== 'undefined' 
        ? localStorage.getItem('contentLanguage') || locale 
        : locale;

      // Step 1: Call /api/transcript
      const transcriptResponse = await fetch('/api/summaries/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, locale, contentLanguage }),
      });

      if (!transcriptResponse.ok) {
        const errorData = await transcriptResponse.json();
        const errorMessage = errorData.error || t('failedToFetchTranscript');
        throw new Error(errorMessage);
      }

      const transcriptDataJSON = await transcriptResponse.json();
      const {
        transcript,
        title,
        description,
        tokenCount,
        fetcher,
      } = transcriptDataJSON;
      
      // Ensure all expected fields are present, providing defaults if necessary
      const data = {
        videoId: videoId,
        locale: locale,
        contentLanguage: contentLanguage,
        transcriptText: transcript || '',
        title: title || 'Untitled Summary',
        videoDescription: description || '',
        tokenCount: tokenCount || 0,
        fetcher: fetcher || 'unknown'
      };
      
      if (!session && tokenCount > 32768) {
        setError(t('guestInputTooLong'));
        setIsLoading(false);
        return;
      }

      if (session?.user?.plan === 'free' && tokenCount > 65536) {
        setShowTokenLimitUpgrade(true); 
        setError(t('unpaidInputTooLong'));
        setIsLoading(false);
        return;
      } 

      // Store data in context
      setGenerationData({
        transcriptData: data,
        folderForSummary: activeFolder ? { id: activeFolder.id, name: activeFolder.name } : null
      });

      // Mark trial as used if not logged in - only after hydration
      if (!session && isHydrated) {
        setTrialUsed(true);
        if (typeof window !== 'undefined') {
            localStorage.setItem('trialUsed', 'true');
        }
      } else if (session && session.user.plan !== 'premium' && isHydrated) {
        // Record generation date for free users - only after hydration
        if (typeof window !== 'undefined') {
          localStorage.setItem('freeUserLastGenerationDate', new Date().toDateString());
        }
      }
      
      // Redirect to the new summary generation page
      router.push(`/${locale}/summaries/new`);

    } catch (err: any) {
      if (!showTokenLimitUpgrade && !dailyLimitExceeded) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-2 space-y-2">
      <div className="flex justify-end mb-6">
        <LanguageSwitcher />
      </div>
      {/* Login Modal/Overlay */}
      {showLoginPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card text-card-foreground p-8 rounded-lg shadow-lg max-w-sm w-full text-center">
              <h2 className="text-xl font-bold mb-4">{t('signIn')}</h2>
              <p className="mb-6">{t('trialUsedPrompt')}</p>
              <Button
                className="w-full bg-foreground hover:opacity-90 text-background mb-2"
                onClick={() => { setShowLoginPrompt(false); signIn("google"); }}
              >
                {t('signInWithGoogle')}
              </Button>
              {isDevMode && (
                <Button
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white mb-2"
                  onClick={() => { 
                    setShowLoginPrompt(false); 
                    signIn("test-account", { 
                      username: "testuser", 
                      password: "test123",
                      callbackUrl: "/" 
                    }); 
                  }}
                >
                  🧪 Test Account
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowLoginPrompt(false)}
              >
                {t('cancel')}
              </Button>
            </div>
          </div>
        )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Input
              type="url"
              placeholder={t('videoUrl')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="border-input bg-background text-foreground placeholder:text-muted-foreground ring-1 ring-ring ring-offset-2 focus-visible:ring-red-600 focus-visible:ring-offset-background transition-colors pr-10 w-full"
              required
              pattern="^https?://(www\.|m\.)?(youtube\.com/(watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/).+" // eslint-disable-line no-useless-escape
              // title={t('youtubeUrlHint')}
            />
            {url && (
              <button
                type="button"
                onClick={() => setUrl("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1 text-gray-400 hover:text-red-500 bg-background rounded-full"
                style={{ boxShadow: '0 0 2px rgba(0,0,0,0.05)' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <YoutubeIcon className="mr-2 h-4 w-4" />
            )}
            <span className="block sm:hidden">{isLoading ? t('loadingShort') : t('getSummaryShort')}</span>
            <span className="hidden sm:block">{isLoading ? t('loading') : t('getSummary')}</span>
          </Button>
        </div>
      </form>

      <div>
        {!session && (
            <p className="text-sm text-zinc-500 text-center mt-4 mb-4">{t('trialInfo')}</p>
        )}
      </div>

      {inAppBrowser && (
        <div className="mt-4 bg-red-100 text-red-700 p-4 rounded-md text-base font-semibold flex flex-col items-center mb-4">
          <p className="text-center">
            {t('inAppBrowserWarning.line1')} <br />
            {t('inAppBrowserWarning.line2')}
          </p>
          <button
            className="mt-2 px-3 py-1 bg-red-200 rounded text-red-900 font-bold"
            onClick={() => navigator.clipboard.writeText(window.location.href)}
          >
            {t('copyCurrentUrl')}
          </button>
        </div>
      )}

      {(showTokenLimitUpgrade || dailyLimitExceeded) && (
        <div className="mt-4">
          <Alert variant="destructive" className="bg-yellow-50 border-yellow-300 text-yellow-800 mt-4">
            <AlertCircle className="h-4 w-4 !text-yellow-700" />
            <AlertDescription>
              {showTokenLimitUpgrade ? t('unpaidInputTooLong') : t('dailyLimitExceededError')}
              <br />
              {t('subCTA')}
              <br />
              <button 
                onClick={openSubscriptionModal}
                className="underline font-bold hover:text-yellow-900"
              >
                {t('upgrade')}
              </button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {error && !showTokenLimitUpgrade && !dailyLimitExceeded && (
        <Alert variant="destructive" className="mt-4 bg-red-50 border-red-200 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
} 