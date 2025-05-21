import { supabase } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';
import { ScrollToTopButton } from '@/components/home/ScrollToTopButton';
import { Suspense } from 'react';
import SummaryContent from '@/components/SummaryContent';
import { Loader2 } from 'lucide-react';
export default async function SummaryDetailPage({ params }: { params: Promise<{ summaryId: string; locale: string; }> }) {
  const resolvedParams = await params;
  const summaryId = resolvedParams.summaryId;
  const locale = resolvedParams.locale;
  
  const { data: summary, error: summaryError } = await supabase
    .from('summaries')
    .select('id, name, summary, video_id, created_at, folder_id, locale, transcript, mindmap')
    .eq('id', summaryId)
    .single();

  if (summaryError || !summary) {
    notFound();
  }

  const { data: folder, error: folderError } = await supabase
    .from('folders')
    .select('id, name')
    .eq('id', summary.folder_id)
    .single();

  if (folderError || !folder) {
    notFound();
  }

  return (
    <>
      <ScrollToTopButton />
      <Suspense fallback={<Loader2 className="h-16 w-16 animate-spin" />}>
        <SummaryContent summary={summary} folder={folder} locale={locale} mindmap={summary.mindmap || null} summaryId={summaryId} />
      </Suspense>
    </>
  );
} 
