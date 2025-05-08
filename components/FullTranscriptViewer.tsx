'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from '@/lib/supabase'; // Assuming supabase client

interface FullTranscriptViewerProps {
  videoId: string | null; // videoId is essential for fetching from Supabase
  locale?: string; 
  // initialTranscript prop is removed as we fetch from Supabase
}

export function FullTranscriptViewer({ videoId, locale = 'en' }: FullTranscriptViewerProps) {
  const t = useTranslations(); 
  const [transcript, setTranscript] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoId) {
      setTranscript(null);
      setVideoTitle(null);
      setError(null);
      setLoading(false);
      return;
    }

    const fetchTranscriptFromSupabase = async () => {
      setLoading(true);
      setError(null);
      setTranscript(null);
      setVideoTitle(null);

      try {
        const { data, error: dbError } = await supabase
          .from('youtube_videos')
          .select('raw_transcript, title, description') // Select necessary fields
          .eq('video_id', videoId)
          .single(); // Expecting a single row or null

        if (dbError && dbError.code !== 'PGRST116') { // PGRST116: 'Searched item was not found' - not an error for us here
          console.error("Supabase error fetching transcript:", dbError);
          throw new Error(t('errorFetchingTranscript'));
        }

        if (data) {
          setTranscript(data.raw_transcript);
          setVideoTitle(data.title);
          // Not displaying description for now, but it's available: data.description
        } else {
          // No data found, but not necessarily an error if PGRST116
          // This could mean the transcript hasn't been processed by /api/transcript yet
          // Or it's genuinely not available. 
          // We could set a specific message or rely on the general "no transcript" message below.
          console.log(`No transcript data found in Supabase for videoId: ${videoId}`);
        }

      } catch (err: any) {
        console.error("Error in fetchTranscriptFromSupabase:", err);
        setError(err.message || t('errorFetchingTranscript'));
      }
      setLoading(false);
    };

    fetchTranscriptFromSupabase();
  }, [videoId, t]); // locale might not be needed if translations are only for UI fallbacks

  // If loading and no videoId, don't show loading, just return null or an appropriate message
  if (!videoId) {
    // Optionally, display a message like "Select a video to see the transcript"
    return null; 
  }

  if (loading) {
    return (
      <Card className="p-6 bg-white border-zinc-200 mt-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-1/4 mb-3" />
          <Skeleton className="h-4 w-full mb-3" />
          <Skeleton className="h-4 w-full mb-3" />
          <Skeleton className="h-4 w-5/6 mb-3" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-6 bg-red-50 border-red-200 text-red-600">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!transcript) { // Handles null or empty string from Supabase, or if not found
    return (
        <Alert className="mt-6 bg-blue-50 border-blue-200 text-blue-700">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t('noTranscriptAvailableOrNotProcessed')}</AlertDescription> 
            {/* New translation key ^ */}
        </Alert>
    );
  }

  return (
    <Card className="p-6 bg-white border-zinc-200 mt-6">
      {videoTitle && <h2 className="text-xl font-semibold mb-1 text-zinc-800">{videoTitle}</h2>}
      <h3 className="text-lg font-medium mb-4 text-zinc-700">{t('fullTranscriptTitle')}</h3>
      <div 
        className="prose prose-zinc max-w-none text-sm whitespace-pre-line text-gray-700 max-h-96 overflow-y-auto"
        style={{ lineHeight: '1.6' }}
      >
        {transcript}
      </div>
    </Card>
  );
} 