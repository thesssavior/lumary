"use client";

import { useState, useEffect, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { YoutubeIcon, AlertCircle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './language-switcher';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { signIn, useSession } from "next-auth/react";
import { SidebarRefreshContext } from './SidebarLayout';

const FINAL_SYNTHESIS_MARKER = ":::FINAL_SYNTHESIS_START:::";

// Define props for VideoSummary
interface VideoSummaryProps {
  initialUrl?: string; // Optional initial URL from catch-all route
}

export function VideoSummary({ initialUrl = "" }: VideoSummaryProps) {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const [url, setUrl] = useState(initialUrl);
  const [summary, setSummary] = useState("");
  const [synthesis, setSynthesis] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [error, setError] = useState("");
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const { data: session, status } = useSession();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [trialUsed, setTrialUsed] = useState(false);
  const refreshSidebar = useContext(SidebarRefreshContext);

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTrialUsed = localStorage.getItem('trialUsed');
      if (storedTrialUsed === 'true') {
        setTrialUsed(true);
      }
    }
  }, []);

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
    setSynthesis("");
    setIsSynthesizing(false);
    setLoading(true);

    if (!session) {
      if (trialUsed) {
        setShowLoginPrompt(true);
        setLoading(false);
        return;
      }
      console.log("Proceeding with anonymous trial summary generation.");
    }

    let accumulatedData = "";
    let foundMarker = false;
    let finalCombinedSummaryForSaving = "";

    try {
      const videoId = extractVideoId(url);
      if (!videoId) {
        throw new Error(t('error') || 'Invalid URL');
      }

      const summaryResponse = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, locale }),
      });

      if (!summaryResponse.ok) {
         const errorData = await summaryResponse.json();
         throw new Error(errorData.error || t('error') || 'API Error');
      }
      if (!summaryResponse.body) {
        throw new Error(t('error') || 'Empty Response Body');
      }

      const reader = summaryResponse.body.getReader();
      const decoder = new TextDecoder();
      let foundMarker = false;
      let finalSummaryBuffer = '';
      let finalSynthBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });

        if (!foundMarker) {
          const markerIndex = chunkText.indexOf(FINAL_SYNTHESIS_MARKER);
          if (markerIndex !== -1) {
            // Found the start of smoothing synthesis
            foundMarker = true;
            setIsSynthesizing(true);
            // Text before marker belongs to summary
            const before = chunkText.slice(0, markerIndex);
            // Text after marker starts the synthesis
            const after = chunkText.slice(markerIndex + FINAL_SYNTHESIS_MARKER.length);
            finalSummaryBuffer += before;
            finalSynthBuffer = after;
            setSummary(finalSummaryBuffer);
            setSynthesis(finalSynthBuffer);
          } else {
            // Still in chunk summary phase
            finalSummaryBuffer += chunkText;
            setSummary(finalSummaryBuffer);
          }
        } else {
          // In smoothing synthesis phase
          finalSynthBuffer += chunkText;
          setSynthesis(finalSynthBuffer);
        }
      }
      console.log("Stream finished.");
      setIsSynthesizing(false);

      // Save only final synthesis if exists, else summary
      const toSave = finalSynthBuffer || finalSummaryBuffer;
      console.log('Final content to save:', toSave);
      finalCombinedSummaryForSaving = toSave;

      if (!session && finalCombinedSummaryForSaving) {
        setTrialUsed(true);
        if (typeof window !== 'undefined') {
            localStorage.setItem('trialUsed', 'true');
        }
        console.log("Anonymous trial used and persisted.");
      }

      if (session && finalCombinedSummaryForSaving && !error) {
        console.log("Attempting to save summary...");
        if (folders.length > 0) {
            let videoTitle: string | null = null;
            try {
                console.log(`Fetching title for ${videoId} from API...`);
                const titleRes = await fetch(`/api/youtube/title?videoId=${videoId}`);
                if (titleRes.ok) {
                  const titleData = await titleRes.json();
                  videoTitle = titleData.title;
                  console.log(`Fetched title: ${videoTitle}`);
                } else {
                  console.error('Failed to fetch video title from API:', await titleRes.text());
                }
            } catch (titleError) {
                console.error('Error calling title API:', titleError);
            }

            try {
                console.log(`Saving summary to folder ${folders[0].id}...`);
                const saveResponse = await fetch(`/api/folders/${folders[0].id}/summaries`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    videoId,
                    title: videoTitle || 'Untitled Summary',
                    summary: finalCombinedSummaryForSaving,
                    inputTokens: summaryResponse.headers.get('Input-Tokens') || '0',
                  }),
                });
                if (!saveResponse.ok) {
                  const errorData = await saveResponse.json();
                  console.error('Failed to save summary:', errorData);
                  setError(t('saveError') || 'Failed to save summary.');
                } else {
                  const savedData = await saveResponse.json();
                  console.log('Summary saved successfully:', savedData);
                  if (refreshSidebar) {
                      console.log("Calling refreshSidebar...");
                      refreshSidebar();
                  }
                }
            } catch (saveError) {
                console.error('Error saving summary:', saveError);
                setError(t('saveError') || 'Error saving summary.');
            }
        } else {
            console.warn("No folders available to save summary to.");
        }
      }

    } catch (err: any) {
      console.error("Error during handleSubmit:", err);
      setError(err.message || t('error') || 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setIsSynthesizing(false);
    }
  };

  const displaySummary = synthesis || summary;
  const showLoadingSkeleton = loading && !displaySummary;
  const showSummaryCard = displaySummary || showLoadingSkeleton;

  return (
    <div className="space-y-8">
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
            className="border-zinc-200 bg-white text-black placeholder:text-zinc-500 ring-1 ring-ring ring-offset-2 focus-visible:ring-red-600 focus-visible:ring-offset-white transition-colors"
            required
            pattern="^https?:\/\/(www\.|m\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/).+"
            title="Please enter a valid YouTube URL (e.g., https://www.youtube.com/watch?v=..., https://youtu.be/..., https://www.youtube.com/embed/..., or https://m.youtube.com/watch?v=...)"
          />
          <Button 
            type="submit" 
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <YoutubeIcon className="mr-2 h-4 w-4" />}
            {loading ? t('loading') : t('getSummary')}
          </Button>
        </div>
      </form>

      {!session && (
          <p className="text-sm text-zinc-500 text-center mt-2">{t('trialInfo')}</p>
      )}

      {error && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showSummaryCard && (
        <Card className="p-6 bg-white border-zinc-200">
          <div className="prose prose-zinc max-w-none">
            <div className="text-black [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg [&>p]:text-base [&>ul]:list-disc [&>ol]:list-decimal [&>li]:ml-4 [&>h1]:mb-6 [&>h1:not(:first-child)]:mt-10 [&>h2]:mb-5 [&>h2:not(:first-child)]:mt-8 [&>h3]:mb-4 [&>h3:not(:first-child)]:mt-6 [&>p]:mb-5 [&>ul]:mb-5 [&>ol]:mb-5 [&>li]:mb-3 [&>ol]:pl-8 [&>ul]:pl-8 [&>strong]:font-bold [&>strong]:text-black">
              {showLoadingSkeleton ? (
                <>
                  <Skeleton className="h-6 w-3/4 mb-6" />
                  <Skeleton className="h-4 w-full mb-3" />
                  <Skeleton className="h-4 w-full mb-3" />
                  <Skeleton className="h-4 w-5/6 mb-6" />
                  <Skeleton className="h-4 w-full mb-3" />
                  <Skeleton className="h-4 w-full mb-3" />
                  <Skeleton className="h-4 w-4/6 mb-3" />
                </>
              ) : (
                <ReactMarkdown>
                  {synthesis || summary}
                </ReactMarkdown>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}