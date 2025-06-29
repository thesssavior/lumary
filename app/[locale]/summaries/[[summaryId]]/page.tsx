"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ScrollToTopButton } from '@/components/home/ScrollToTopButton';
import SummaryContent from '@/components/SummaryContent';
import { Loader2 } from 'lucide-react';
import { useSummaryGeneration } from '@/contexts/SummaryGenerationContext';
import { useParams } from 'next/navigation';

export default function SummaryDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const summaryId = params.summaryId as string | undefined;
  
  const { generationData } = useSummaryGeneration();
  const [summary, setSummary] = useState<any>(null);
  const [folder, setFolder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    } else if (summaryId) {
      // Existing summary mode - fetch from DB
      fetchExistingSummary(summaryId);
    } else {
      // No summaryId - might be initial load, keep loading
      setLoading(true);
    }
  }, [summaryId, generationData, locale]);

  const fetchExistingSummary = async (id: string) => {
    try {
      setLoading(true);
      
      const { data: summaryData, error: summaryError } = await supabase
        .from('summaries')
        .select('id, name, summary, video_id, created_at, folder_id, locale, content_language, transcript, mindmap, quiz, description')
        .eq('id', id)
        .single();

      if (summaryError || !summaryData) {
        setError('Summary not found');
        return;
      }

      const { data: folderData, error: folderError } = await supabase
        .from('folders')
        .select('id, name')
        .eq('id', summaryData.folder_id)
        .single();

      if (folderError || !folderData) {
        setError('Folder not found');
        return;
      }

      setSummary(summaryData);
      setFolder(folderData);
    } catch (err) {
      setError('Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-16 w-16 animate-spin" />
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
      />
    </>
  );
} 
