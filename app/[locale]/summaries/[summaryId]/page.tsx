import { supabase } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Suspense } from 'react';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';
import { Folder } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullTranscriptViewer } from "@/components/FullTranscriptViewer";
import { getTranslations } from 'next-intl/server';

async function SummaryContent({ summary, folder, locale }: { summary: any; folder: any; locale: string }) {
  const t = await getTranslations({locale});

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href={`/${summary.locale}/folders/${folder.id}`} className="flex items-center gap-1 hover:text-gray-700">
          <Folder className="w-4 h-4" />
          <span>{folder.name}</span>
        </Link>
        <span>/</span>
      </div>

      <h1 className="text-4xl font-bold mb-4">{summary.name}</h1>
      <div>
        <div className="text-gray-500 text-xs">Video ID: {summary.video_id}</div>
        <div className="text-gray-500 text-xs">Created: {new Date(summary.created_at).toLocaleString()}</div>
      </div>
      
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">{t('summaryTab')}</TabsTrigger>
          <TabsTrigger value="transcript">{t('transcriptTab')}</TabsTrigger>
          <TabsTrigger value="mindmap">{t('mindmapTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4 p-0 border-0">
          <div className="prose prose-zinc max-w-none p-6 border rounded-md">
            <div className="text-black [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg [&>p]:text-base [&>ul]:list-disc [&>ol]:list-decimal [&>li]:ml-4 [&>h1]:mb-6 [&>h1:not(:first-child)]:mt-10 [&>h2]:mb-5 [&>h2:not(:first-child)]:mt-8 [&>h3]:mb-4 [&>h3:not(:first-child)]:mt-6 [&>p]:mb-5 [&>ul]:mb-5 [&>ol]:mb-5 [&>li]:mb-3 [&>ol]:pl-8 [&>ul]:pl-8 [&>strong]:font-bold [&>strong]:text-black">
                <ReactMarkdown>{summary.summary}</ReactMarkdown>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="transcript" className="mt-4 p-0 border-0">
          <div className="p-4 border rounded-md">
            {summary.transcript ? (
              <FullTranscriptViewer transcript={summary.transcript} />
            ) : (
              <p className="text-gray-500">No transcript available for this summary.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="mindmap" className="mt-4 p-6 border rounded-md">
          <p className="text-gray-500">Mindmap coming soon!</p>
        </TabsContent>

      </Tabs>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-1" /> 
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" /> 
      <div className="h-8 bg-gray-300 rounded w-3/4 mb-2" /> 
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-1" />
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-6" />
      
      <div className="flex space-x-1 border-b mb-4">
        <div className="h-10 bg-gray-200 rounded-t w-1/3" />
        <div className="h-10 bg-gray-100 rounded-t w-1/3" />
        <div className="h-10 bg-gray-100 rounded-t w-1/3" />
      </div>
      <div className="space-y-3 p-6 border rounded-md">
        <div className="h-5 bg-gray-200 rounded w-5/6" />
        <div className="h-5 bg-gray-200 rounded w-full" />
        <div className="h-5 bg-gray-200 rounded w-4/6" />
        <div className="h-5 bg-gray-200 rounded w-full mt-4" />
        <div className="h-5 bg-gray-200 rounded w-3/4" />
      </div>
    </div>
  );
}

export default async function SummaryDetailPage({ params }: { params: Promise<{ summaryId: string; locale: string; }> }) {
  const resolvedParams = await params;
  const summaryId = resolvedParams.summaryId;
  const locale = resolvedParams.locale;
  
  const { data: summary, error: summaryError } = await supabase
    .from('summaries')
    .select('id, name, summary, video_id, created_at, folder_id, locale, transcript')
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
      <Suspense fallback={<SummarySkeleton />}>
        <SummaryContent summary={summary} folder={folder} locale={locale} />
      </Suspense>
    </>
  );
} 
