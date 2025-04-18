import { supabase } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';

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
    <div className="max-w-2xl mx-auto p-8 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">{summary.name}</h1>
      <div className="mb-2 text-gray-500 text-xs">Video ID: {summary.video_id}</div>
      <div className="mb-2 text-gray-500 text-xs">Created: {new Date(summary.created_at).toLocaleString()}</div>
      <div className="prose mt-6 whitespace-pre-line">{summary.summary}</div>
    </div>
  );
} 