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
import { VideoPlayer } from './yt_videos/VideoPlayer';
import { TranscriptPanel } from './yt_videos/TranscriptPanel';

type Props = {
    summary: any;
    folder: any;
    locale: string;
    mindmap: any | null;
    summaryId: string | null | undefined;
    quiz: any | null;
    contentLanguage: string;
    isStreamingMode?: boolean;
    layoutMode?: 'default' | 'split';
}

export default function SummaryContent({ 
  summary, 
  folder, 
  locale, 
  mindmap, 
  summaryId, 
  quiz, 
  contentLanguage, 
  isStreamingMode = false,
  layoutMode = 'default'
}: Props) {
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

    // Split layout mode
    if (layoutMode === 'split') {
      return (
        <div className="flex h-full w-full bg-gray-50">
          {/* Left Panel */}
          <div className="flex flex-col w-1/2 space-y-1 mt-1">
            {/* Video Player - Top Left */}
            <div className="h-[46vh] p-1 rounded-lg">
              <VideoPlayer videoId={summary.video_id} title={summary.name} />
            </div>

            {/* Transcript - Bottom Left */}
            <div className="h-[46vh] p-1 rounded-lg">
              <TranscriptPanel transcript={summary.transcript} />
            </div>
          </div>

          {/* Right Panel - Summary Content */}
          <div className="w-1/2 p-1 mt-1">
            <div className="h-[91vh] bg-white border overflow-hidden rounded-lg">
              <div className="h-full flex flex-col">
                {/* Header
                <div className="px-4 py-3 border-b bg-gray-50 flex-shrink-0">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Folder className="w-4 h-4" />
                    <span>{folder?.name}</span>
                    <span>/</span>
                  </div>
                  <h1 className="text-xl font-bold text-gray-900">{summary.name}</h1>
                  {summary.created_at && (
                    <div className="text-gray-500 text-xs mt-1">
                      Created: {new Date(summary.created_at).toLocaleString()}
                    </div>
                  )}
                </div> */}

                {/* Tabs Content - Only Summary, Mindmap, Quiz (no transcript) */}
                <div className="flex-1 overflow-hidden">
                  <Tabs defaultValue="summary" value={activetab} onValueChange={setActivetab} className="h-full flex flex-col">
                    <TabsList className="grid w-[90%] grid-cols-3 mx-2 mt-2 mb-0 flex-shrink-0">
                      <TabsTrigger value="summary">{t('summaryTab')}</TabsTrigger>
                      <TabsTrigger value="mindmap">{t('mindmapTab')}</TabsTrigger>
                      <TabsTrigger value="quiz">{t('quizTab')}</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-auto">
                      <TabsContent value="summary" className="m-0 h-full">
                        <div className="p-4 h-full overflow-auto">
                          <div className="prose prose-zinc max-w-none pr-10 relative h-full">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={copyToClipboard}
                              className="absolute top-0 right-0 h-8 w-8 p-0 hover:bg-gray-100"
                              title={copied ? t('copiedToClipboard') : t('copySummary')}
                            >
                              {copied ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <div className="text-black [&>h1]:text-xl [&>h2]:text-lg [&>h3]:text-base [&>p]:text-sm [&>ul]:list-disc [&>ol]:list-decimal [&>li]:ml-4 [&>h1]:mb-4 [&>h1:not(:first-child)]:mt-6 [&>h2]:mb-3 [&>h2:not(:first-child)]:mt-5 [&>h3]:mb-2 [&>h3:not(:first-child)]:mt-4 [&>p]:mb-3 [&>ul]:mb-3 [&>ol]:mb-3 [&>li]:mb-2 [&>ol]:pl-6 [&>ul]:pl-6 [&>strong]:font-bold [&>strong]:text-black">
                              <ReactMarkdown>{summary.summary}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent 
                        value="mindmap" 
                        forceMount={true} 
                        className="data-[state=active]:block hidden m-0 h-full"
                      >
                        <div className="p-2 h-full">
                          {summary.summary ? (
                            <Mindmap 
                              summary={summary.summary} 
                              locale={locale} 
                              contentLanguage={contentLanguage}
                              mindmap={mindmap} 
                              summaryId={summaryId || null}
                              isActive={activetab === "mindmap"}
                            />
                          ) : (
                            <p className="text-gray-500 p-4">Summary not available for mindmap generation.</p>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent 
                        value="quiz" 
                        forceMount={true} 
                        className="data-[state=active]:block hidden m-0 h-full"
                      >
                        <div className="p-2 h-full overflow-auto">
                          <Quiz 
                            summary={summary.summary} 
                            quizData={quiz} 
                            locale={locale} 
                            summaryId={summaryId || null} 
                          />
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Default layout mode (original)
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 h-full overflow-auto">
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
                summaryId={summaryId || null}
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
              summaryId={summaryId || null} 
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
  