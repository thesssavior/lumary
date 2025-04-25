import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUp } from 'lucide-react';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';

function SummaryContent({ summary }: { summary: any }) {
  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">{summary.name}</h1>
      <div className="mb-2 text-gray-500 text-xs">Video ID: {summary.video_id}</div>
      <div className="mb-2 text-gray-500 text-xs">Created: {new Date(summary.created_at).toLocaleString()}</div>
      <Card className="p-6 bg-white border-zinc-200">
        <div className="prose prose-zinc max-w-none">
            <div className="text-black [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg [&>p]:text-base [&>ul]:list-disc [&>ol]:list-decimal [&>li]:ml-4 [&>h1]:mb-6 [&>h1:not(:first-child)]:mt-10 [&>h2]:mb-5 [&>h2:not(:first-child)]:mt-8 [&>h3]:mb-4 [&>h3:not(:first-child)]:mt-6 [&>p]:mb-5 [&>ul]:mb-5 [&>ol]:mb-5 [&>li]:mb-3 [&>ol]:pl-8 [&>ul]:pl-8 [&>strong]:font-bold [&>strong]:text-black">
                <ReactMarkdown>{summary.summary}</ReactMarkdown>
            </div>
        </div>
      </Card>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded shadow animate-pulse">
      <div className="h-8 w-1/2 bg-gray-200 rounded mb-4" />
      <div className="h-4 w-1/3 bg-gray-100 rounded mb-2" />
      <div className="h-4 w-1/4 bg-gray-100 rounded mb-2" />
      <div className="h-40 w-full bg-gray-100 rounded mt-6" />
    </div>
  );
}

export default async function SummaryDetailPage({ params }: { params: Promise<{ summaryId: string }> }) {
  const { summaryId } = await params;
  const { data: summary, error } = await supabase
    .from('summaries')
    .select('id, name, summary, video_id, created_at')
    .eq('id', summaryId)
    .single();

  if (error || !summary) {
    notFound();
  }

  return (
    <>
      <ScrollToTopButton />
      <Suspense fallback={<SummarySkeleton />}>
        <SummaryContent summary={summary} />
      </Suspense>
    </>
  );
} 
