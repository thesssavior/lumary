'use client';

import ReactMarkdown from 'react-markdown';
import { Folder, Copy, Check } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullTranscriptViewer } from "@/components/yt_videos/FullTranscriptViewer";
import Mindmap from '@/components/yt_videos/Mindmap';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import Quiz from './yt_videos/Quiz';
import { Button } from '@/components/ui/button';

type Props = {
    summary: any;
    folder: any;
    locale: string;
    mindmap: any | null;
    summaryId: string;
    quiz: any | null;
    contentLanguage: string;
}

export default function SummaryContent({ summary, folder, locale, mindmap, summaryId, quiz, contentLanguage }: Props) {
    const t = useTranslations();
    const [activetab, setActivetab] = useState("summary");
    const [copied, setCopied] = useState(false);
  
    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(summary.summary);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    };
  
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          {/* <Link href={`/${summary.locale}/folders/${folder.id}`} className="flex items-center gap-1 hover:text-gray-700"> */}
          <Folder className="w-4 h-4" />
          <span>{folder.name}</span>
          {/* </Link> */}
          <span>/</span>
        </div>
  
        <h1 className="text-4xl font-bold mb-4">{summary.name}</h1>
        <div>
          <div className="text-gray-500 text-xs">Video ID: {summary.video_id}</div>
          <div className="text-gray-500 text-xs">Created: {new Date(summary.created_at).toLocaleString()}</div>
        </div>
        
        <Tabs defaultValue="summary" value={activetab} onValueChange={setActivetab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {/* <TabsTrigger value="summary" className="data-[state=active]:bg-black data-[state=active]:text-white">{t('summaryTab')}</TabsTrigger> */}
            <TabsTrigger value="summary" >{t('summaryTab')}</TabsTrigger>
            <TabsTrigger value="mindmap" >{t('mindmapTab')}</TabsTrigger>
            <TabsTrigger value="quiz" >{t('quizTab')}</TabsTrigger>
            <TabsTrigger value="transcript" >{t('transcriptTab')}</TabsTrigger>
          </TabsList>
  
          <TabsContent value="summary" className="mt-4 p-0 border-0">
            <div className="prose prose-zinc max-w-none p-6 pr-16 border rounded-md relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="absolute top-4 right-4 h-8 w-8 p-0 hover:bg-gray-100"
                title={copied ? t('copiedToClipboard') : t('copySummary')}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <div className="text-black [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg [&>p]:text-base [&>ul]:list-disc [&>ol]:list-decimal [&>li]:ml-4 [&>h1]:mb-6 [&>h1:not(:first-child)]:mt-10 [&>h2]:mb-5 [&>h2:not(:first-child)]:mt-8 [&>h3]:mb-4 [&>h3:not(:first-child)]:mt-6 [&>p]:mb-5 [&>ul]:mb-5 [&>ol]:mb-5 [&>li]:mb-3 [&>ol]:pl-8 [&>ul]:pl-8 [&>strong]:font-bold [&>strong]:text-black">
                  <ReactMarkdown>{summary.summary}</ReactMarkdown>
              </div>
            </div>
          </TabsContent>
  
          <TabsContent 
            value="mindmap" 
            forceMount={true} 
            className="data-[state=active]:block hidden mt-4 p-0"
            >
            {summary.summary ? (
              <Mindmap 
                summary={summary.summary} 
                locale={locale} 
                contentLanguage={contentLanguage}
                mindmap={mindmap} 
                summaryId={summaryId}
                isActive={activetab === "mindmap"}
              />
            ) : (
              <p className="text-gray-500">Summary not available for mindmap generation.</p>
            )}
          </TabsContent>
  
          <TabsContent 
            value="quiz" 
            forceMount={true} 
            className="data-[state=active]:block hidden mt-4 p-0"
          >
            <Quiz 
              summary={summary.summary} 
              quizData={quiz} 
              locale={locale} 
              summaryId={summaryId} 
            />
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
  
  
        </Tabs>
      </div>
    );
  }
  