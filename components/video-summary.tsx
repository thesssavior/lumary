"use client";

import { useState, useEffect, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { YoutubeIcon, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './language-switcher';
import { useParams, useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { signIn, useSession } from "next-auth/react";
import { SidebarRefreshContext } from './SidebarLayout';
import { v4 as uuidv4 } from 'uuid';

export function VideoSummary() {
  const t = useTranslations();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const { data: session, status } = useSession();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [trialUsed, setTrialUsed] = useState(false);
  const refreshSidebar = useContext(SidebarRefreshContext);

  // Fetch folders on mount - only if logged in
  useEffect(() => {
    if (session) {
      fetch('/api/folders').then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setFolders(data);
        }
      });
    }
  }, [session]);

  // Check localStorage for trial status on mount
  useEffect(() => {
    if (typeof window !== 'undefined') { // Ensure localStorage is available
      const storedTrialUsed = localStorage.getItem('trialUsed');
      if (storedTrialUsed === 'true') {
        setTrialUsed(true);
      }
    }
  }, []); // Run only once on mount

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

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
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
    setSummary("");
    
    // Check if user needs to log in
    if (!session) {
      if (trialUsed) {
        setShowLoginPrompt(true);
        return;
      }
    }
    
    setLoading(true);

    try {
      const videoId = extractVideoId(url);
      if (!videoId) {
        throw new Error(t('error'));
      }

      // First get the summary
      const summaryResponse = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId, locale }),
      });

      if (!summaryResponse.ok) {
        throw new Error(t('error'));
      }

      if (!summaryResponse.body) {
        throw new Error(t('error'));
      }

      const reader = summaryResponse.body.getReader();
      const input_token_count = parseInt(summaryResponse.headers.get('input_token_count') || '0', 10);
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        result += chunk;
        setSummary(result);
      }
      
      // If the user is anonymous, mark the trial as used after successful summary
      if (!session) {
        setTrialUsed(true);
        if (typeof window !== 'undefined') { // Ensure localStorage is available
            localStorage.setItem('trialUsed', 'true'); // Persist trial usage
        }
      } else {
        // Only attempt to save if the user is logged in
  
        // Save to first folder if available and user is logged in
        if (folders.length > 0) {
          try {
            const saveResponse = await fetch(`/api/folders/${folders[0].id}/summaries`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                videoId,
                summary: result,
                input_token_count: input_token_count,
              }),
            });

            if (!saveResponse.ok) {
              const errorData = await saveResponse.json();
              console.error('Failed to save summary:', errorData);
              throw new Error('Failed to save summary');
            }
            if (refreshSidebar) refreshSidebar();
          } catch (saveError) {
            console.error('Error saving summary:', saveError);
          }
        } else {
          console.log('No folders available to save summary');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const displaySummary = summary;
  const showLoadingSkeleton = loading && !displaySummary;

  return (
    <div className="space-y-8">
      {/* Login Modal/Overlay */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-sm w-full text-center">
            <h2 className="text-xl font-bold mb-4">{t('signIn')}</h2>
            <p className="mb-6">{t('trialUsedPrompt')}</p>
            <Button
              className="w-full bg-black hover:bg-zinc-800 text-white mb-2"
              onClick={() => { setShowLoginPrompt(false); signIn("google"); }}
            >
              {t('signInWithGoogle')}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowLoginPrompt(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder={t('videoUrl')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="border-zinc-200 bg-white text-black placeholder:text-zinc-400 ring-1 ring-ring ring-offset-2 focus-visible:ring-red-600 focus-visible:ring-offset-white transition-colors"
            required
            pattern="^https?:\/\/(www\.|m\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/).+"
            title="Please enter a valid YouTube URL (e.g., https://www.youtube.com/watch?v=..., https://youtu.be/..., https://www.youtube.com/embed/..., or https://m.youtube.com/watch?v=...)"
          />
          <Button 
            type="submit" 
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <YoutubeIcon className="mr-2 h-4 w-4" />
            {loading ? t('loading') : t('getSummary')}
          </Button>
        </div>
      </form>

      {/* Add trial info message here */}      
      {!session && (
          <p className="text-sm text-zinc-500 text-center mt-2">{t('trialInfo')}</p>
      )}

      {error && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Skeleton loader shown when loading and no summary yet */}
      {showLoadingSkeleton && (
        <Card className="p-6 bg-white border-zinc-200">
          <div className="space-y-4">
            <Skeleton className="h-6 w-3/4 mb-6" />
            <Skeleton className="h-4 w-full mb-3" />
            <Skeleton className="h-4 w-full mb-3" />
            <Skeleton className="h-4 w-5/6 mb-6" />
            <Skeleton className="h-4 w-full mb-3" />
            <Skeleton className="h-4 w-full mb-3" />
            <Skeleton className="h-4 w-4/6 mb-3" />
          </div>
        </Card>
      )}

      {summary && (
        <Card className="p-6 bg-white border-zinc-200">
          <div className="prose prose-zinc max-w-none">
            <div className="text-black [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg [&>p]:text-base [&>ul]:list-disc [&>ol]:list-decimal [&>li]:ml-4 [&>h1]:mb-6 [&>h1:not(:first-child)]:mt-10 [&>h2]:mb-5 [&>h2:not(:first-child)]:mt-8 [&>h3]:mb-4 [&>h3:not(:first-child)]:mt-6 [&>p]:mb-5 [&>ul]:mb-5 [&>ol]:mb-5 [&>li]:mb-3 [&>ol]:pl-8 [&>ul]:pl-8 [&>strong]:font-bold [&>strong]:text-black">
              <ReactMarkdown>
                {summary}
              </ReactMarkdown>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}