'use client';

import { Folder } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullTranscriptViewer } from "@/components/yt_videos/FullTranscriptViewer";
import Mindmap from '@/components/yt_videos/Mindmap';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import Quiz from './yt_videos/Quiz';
import { VideoPlayer } from './yt_videos/VideoPlayer';
import { TranscriptPanel } from './yt_videos/TranscriptPanel';
import Chapters from './yt_videos/Chapters';
import Summary from './yt_videos/Summary';
import { VideoPlayerProvider } from '@/contexts/VideoPlayerContext';

type Props = {
    summary: any;
    folder: any;
    locale: string;
    mindmap: any | null;
    summaryId: string | null | undefined;
    quiz: any | null;
    contentLanguage?: string;
    isStreamingMode?: boolean;
    layoutMode?: 'default' | 'split';
    tokenCount?: number;
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
  layoutMode = 'default',
  tokenCount
}: Props) {
    const t = useTranslations();
    const [activetab, setActivetab] = useState("chapters");
    const [generatedChapters, setGeneratedChapters] = useState<any[] | null>(null);
    const [generatedSummary, setGeneratedSummary] = useState('');

    // Split layout mode
    if (layoutMode === 'split') {
      return (
        <VideoPlayerProvider>
          <div className="flex h-full w-full bg-gray-50">
          {/* Left Panel */}
          <div className="flex flex-col w-[50%] ml-1">
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
          <div className="w-[50%] p-1 ml-[-2px]">
            <div className="h-[91.1vh] bg-white border overflow-hidden rounded-lg">
              <div className="h-full flex flex-col">

                {/* Tabs Content - Only Summary, Mindmap, Quiz (no transcript) */}
                <div className="flex-1 overflow-hidden">
                  <Tabs defaultValue="chapters" value={activetab} onValueChange={setActivetab} className="h-full flex flex-col">
                    <TabsList className="grid w-[90%] grid-cols-4 mx-2 mt-2 mb-0 flex-shrink-0">
                      <TabsTrigger value="chapters">{t('chaptersTab')}</TabsTrigger>
                      <TabsTrigger value="summary">{t('summaryTab')}</TabsTrigger>
                      <TabsTrigger value="mindmap">{t('mindmapTab')}</TabsTrigger>
                      <TabsTrigger value="quiz">{t('quizTab')}</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-auto">
                      <TabsContent 
                        value="chapters" 
                        forceMount={true} 
                        className="data-[state=active]:block hidden m-0 h-full"
                      >
                        <div className="p-4 h-full overflow-auto">
                            <Chapters 
                              chapters={summary.chapters} 
                              transcript={summary.transcript} 
                              summaryId={summaryId || undefined} 
                              contentLanguage={contentLanguage}
                              videoId={summary.video_id}
                              folderId={folder?.id}
                              title={summary.name}
                              videoDescription={summary.description}
                              locale={locale}
                              tokenCount={tokenCount}
                              onChaptersGenerated={setGeneratedChapters}
                            />
                        </div>
                      </TabsContent>

                      <TabsContent 
                        value="summary" 
                        forceMount={true} 
                        className="data-[state=active]:block hidden m-0 h-full mt-[-25%]"
                      >
                        <div className="p-4 h-full overflow-auto">
                          <Summary 
                            summary={generatedSummary || summary.summary} 
                            summaryId={summaryId || undefined}
                            contentLanguage={contentLanguage}
                            chapters={generatedChapters || summary.chapters}
                            title={summary.name}
                            videoDescription={summary.description}
                            onSummaryGenerated={setGeneratedSummary}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent 
                        value="mindmap" 
                        forceMount={true} 
                        className="data-[state=active]:block hidden m-0 h-full mt-[-25%]"
                      >
                        <div className="p-2 h-full">
                            <Mindmap 
                              summary={summary.summary} 
                              chapters={generatedChapters || summary.chapters}
                              locale={locale} 
                              contentLanguage={contentLanguage}
                              mindmap={mindmap} 
                              summaryId={summaryId || null}
                              isActive={activetab === "mindmap"}
                            />
                        </div>
                      </TabsContent>

                      <TabsContent 
                        value="quiz" 
                        forceMount={true} 
                        className="data-[state=active]:block hidden m-0 h-full mt-[-25%]"
                      >
                        <div className="p-2 h-full overflow-auto">
                          <Quiz 
                            summary={summary.summary} 
                            chapters={generatedChapters || summary.chapters}
                            quizData={quiz} 
                            locale={locale} 
                            contentLanguage={contentLanguage}
                            summaryId={summaryId || null} 
                            title={summary.name}
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
        </VideoPlayerProvider>
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
  
          <TabsContent value="summary" className="mt-4 p-0 border rounded-lg">
            <Summary 
              summary={summary.summary} 
              summaryId={summaryId || undefined}
              contentLanguage={contentLanguage}
              chapters={summary.chapters}
              title={summary.name}
              videoDescription={summary.description}
            />
          </TabsContent>
  
          <TabsContent 
            value="mindmap" 
            forceMount={true} 
            className="data-[state=active]:block hidden mt-[30%] p-0"
            >
            {(summary.summary || generatedChapters || summary.chapters) ? (
              <Mindmap 
                summary={summary.summary} 
                chapters={generatedChapters || summary.chapters}
                locale={locale} 
                contentLanguage={contentLanguage}
                mindmap={mindmap} 
                summaryId={summaryId || null}
                isActive={activetab === "mindmap"}
              />
            ) : (
              <p className="text-gray-500">Summary or chapters not available for mindmap generation.</p>
            )}
          </TabsContent>
  
          <TabsContent 
            value="quiz" 
            forceMount={true} 
            className="data-[state=active]:block hidden mt-[30%] p-0"
          >
            <Quiz 
              summary={summary.summary} 
              chapters={generatedChapters || summary.chapters}
              quizData={quiz} 
              locale={locale} 
              contentLanguage={contentLanguage}
              summaryId={summaryId || null} 
              title={summary.name}
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
  