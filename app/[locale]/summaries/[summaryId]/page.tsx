"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ScrollToTopButton } from '@/components/home/ScrollToTopButton';
import SummaryContent from '@/components/SummaryContent';
import { Loader2 } from 'lucide-react';
import { useSummaryGeneration } from '@/contexts/SummaryGenerationContext';
import { useParams } from 'next/navigation';

export default function SummaryDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const summaryId = params.summaryId as string | undefined;
  const { data: session, status } = useSession();
  
  const { generationData } = useSummaryGeneration();
  const [summary, setSummary] = useState<any>(null);
  const [folder, setFolder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for session to load
    if (status === 'loading') {
      setLoading(true);
      return;
    }

    if (summaryId === 'new') {
      // New summary mode - use context data
      const { transcriptData, folderForSummary } = generationData;
      
      if (transcriptData) {
        const { videoId, contentLanguage, transcriptText, title, videoDescription } = transcriptData;
        
        // Create summary object from context data
        setSummary({
          id: videoId,
          name: title,
          summary: '', // Will be filled by streaming
          video_id: videoId,
          created_at: null,
          locale: locale,
          content_language: contentLanguage,
          transcript: transcriptText,
          description: videoDescription,
          mindmap: null,
          quiz: null,
        });
        
        setFolder(folderForSummary);
        setLoading(false);
      }
    } else if (summaryId && session?.user && !summary) {
      // Existing summary mode - fetch from DB (only if authenticated and we don't already have data)
      fetchExistingSummary(summaryId);
    } else if (summaryId && !session?.user) {
      // User is not authenticated
      setError('Please sign in to view this summary');
      setLoading(false);
    } else if (!summaryId) {
      // No summaryId - might be initial load, keep loading
      setLoading(true);
    }
  }, [summaryId, generationData, locale, session?.user?.id, status]);

  const fetchExistingSummary = async (id: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/summaries/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Summary not found');
        } else if (response.status === 401) {
          setError('Please sign in to view this summary');
        } else {
          setError('Failed to load summary');
        }
        return;
      }

      const data = await response.json();
      setSummary(data.summary);
      setFolder(data.folder);
    } catch (err) {
      setError('Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-gray-500">No summary data available</p>
      </div>
    );
  }

  return (
    <>
      <ScrollToTopButton />
      <SummaryContent 
        summary={summary} 
        folder={folder} 
        locale={locale} 
        mindmap={summary.mindmap || null} 
        summaryId={summaryId || summary.id} 
        quiz={summary.quiz || null}
        contentLanguage={summary.content_language || locale}
        isStreamingMode={summaryId === 'new'}
        layoutMode="split"
      />
    </>
  );
} 
