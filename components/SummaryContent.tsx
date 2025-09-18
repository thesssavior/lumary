'use client';

import { Folder, RotateCcw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullTranscriptViewer } from "@/components/yt_videos/FullTranscriptViewer";
import Mindmap from '@/components/yt_videos/Mindmap';
import { useTranslations } from 'next-intl';
import { useState, useRef } from 'react';
import Quiz from './yt_videos/Quiz';
import { VideoPlayer } from './yt_videos/VideoPlayer';
import { TranscriptPanel } from './yt_videos/TranscriptPanel';
import Chapters from './yt_videos/Chapters';
import SummaryDefault from './yt_videos/SummaryDefault';
import SummarySplit from './yt_videos/SummarySplit';
import Chat from './yt_videos/Chat';
import { VideoPlayerProvider } from '@/contexts/VideoPlayerContext';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

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
    const [activetab, setActivetab] = useState(layoutMode === 'split' ? 'chapters' : 'summary');
    const [generatedChapters, setGeneratedChapters] = useState<any[] | null>(null);
    const [generatedSummary, setGeneratedSummary] = useState('');
    const [generatedSummaryDefault, setGeneratedSummaryDefault] = useState('');
    
    // Refs for resizable panels
    const horizontalPanelGroupRef = useRef<any>(null);
    const verticalPanelGroupRef = useRef<any>(null);
    
    // Reset layout to default sizes
    const resetLayout = () => {
      if (horizontalPanelGroupRef.current) {
        horizontalPanelGroupRef.current.setLayout([46, 54]);
      }
      if (verticalPanelGroupRef.current) {
        verticalPanelGroupRef.current.setLayout([54, 46]);
      }
    };

    // Split layout mode
    if (layoutMode === 'split') {
      return (
        <VideoPlayerProvider>
          <div className="w-full" style={{ height: 'calc(100vh - 4.2rem)' }}>
                <ResizablePanelGroup ref={horizontalPanelGroupRef} direction="horizontal" className="h-full">
                {/* Left Panel */}
                <ResizablePanel defaultSize={46} minSize={25}>
                  <ResizablePanelGroup ref={verticalPanelGroupRef} direction="vertical" className="h-full">
                    {/* Video Player - Top Left */}
                    <ResizablePanel defaultSize={54} minSize={25} className="p-1 ml-2">
                      <VideoPlayer videoId={summary.video_id} title={summary.name} />
                    </ResizablePanel>

                    {/* Horizontal divider between video and transcript */}
                    <ResizableHandle />

                    {/* Transcript - Bottom Left */}
                    <ResizablePanel defaultSize={46} minSize={15} className="p-1">
                      <TranscriptPanel transcript={summary.transcript} />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>

                {/* Vertical divider between left and right panels */}
                <ResizableHandle />

                {/* Right Panel - Summary Content */}
                <ResizablePanel defaultSize={54} minSize={30} className="p-1">
                <div className="h-full overflow-hidden">
                  <div className="h-full flex flex-col">

                    {/* Tabs Content - Only Summary, Mindmap, Quiz (no transcript) */}
                    <div className="flex-1 overflow-hidden">
                      <Tabs defaultValue="chapters" value={activetab} onValueChange={setActivetab} className="h-full flex flex-col">
                        <div className="flex items-center gap-2 mx-2 mt-2 mb-0 flex-shrink-0">
                          {/* Tabs */}
                          <TabsList className="grid grid-cols-5 flex-1">
                            <TabsTrigger value="chapters">{t('chaptersTab')}</TabsTrigger>
                            <TabsTrigger value="summary">{t('summaryTab')}</TabsTrigger>
                            <TabsTrigger value="mindmap">{t('mindmapTab')}</TabsTrigger>
                            <TabsTrigger value="quiz">{t('quizTab')}</TabsTrigger>
                            <TabsTrigger value="chat">{t('chatTab')}</TabsTrigger>
                          </TabsList>
                          
                          {/* Reset layout button */}
                          <button
                            onClick={resetLayout}
                            className="flex items-center gap-1 px-1 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                            title="Reset layout to default sizes"
                          >
                            <RotateCcw className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          </button>
                        </div>

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
                                  layout="split"
                                />
                            </div>
                          </TabsContent>

                          <TabsContent 
                            value="summary" 
                            forceMount={true} 
                            className="data-[state=active]:block hidden m-0 h-full"
                          >
                            <div className="p-4 h-full overflow-auto">
                              <SummarySplit 
                                summary={generatedSummary || summary.summary} 
                                summaryId={summaryId || undefined}
                                contentLanguage={contentLanguage}
                                transcript={summary.transcript}
                                chapters={generatedChapters || summary.chapters}
                                title={summary.name}
                                videoDescription={summary.description}
                                tokenCount={tokenCount}
                                videoId={summary.video_id}
                                locale={locale}
                                onSummaryGenerated={setGeneratedSummary}
                              />
                            </div>
                          </TabsContent>

                          <TabsContent 
                            value="mindmap" 
                            forceMount={true} 
                            className="data-[state=active]:block hidden m-0 h-full"
                          >
                            <div className="p-2 h-full relative z-0">
                                <Mindmap 
                                  summary={summary.summary} 
                                  chapters={generatedChapters || summary.chapters}
                                  locale={locale} 
                                  contentLanguage={contentLanguage}
                                  mindmap={mindmap} 
                                  summaryId={summaryId || null}
                                  isActive={activetab === "mindmap"}
                                  layout="split"
                                />
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
                                chapters={generatedChapters || summary.chapters}
                                quizData={quiz} 
                                locale={locale} 
                                contentLanguage={contentLanguage}
                                summaryId={summaryId || null} 
                                title={summary.name}
                                layout="split"
                              />
                            </div>
                          </TabsContent>

                          <TabsContent 
                            value="chat" 
                            forceMount={true} 
                            className="data-[state=active]:block hidden m-0 h-full"
                          >
                            <div className="h-full">
                              <Chat 
                                summary={generatedSummary || summary.summary}
                                chapters={generatedChapters || summary.chapters}
                                transcript={summary.transcript}
                                locale={locale} 
                                contentLanguage={contentLanguage}
                                summaryId={summaryId || null}
                                title={summary.name}
                                videoId={summary.video_id}
                                layout="split"
                              />
                            </div>
                          </TabsContent>
                        </div>
                      </Tabs>
                    </div>
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </VideoPlayerProvider>
      );
    }

    // Default layout mode (original)
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 h-full">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Folder className="w-4 h-4" />
          <span>{folder.name}</span>
          <span>/</span>
        </div>
  
        <h1 className="text-4xl font-bold mb-4">{summary.name}</h1>
        {/* <div>
          <div className="text-gray-500 text-xs">{t('videoId')}: {summary.video_id}</div>
          <div className="text-gray-500 text-xs">{t('createdAt')}: {new Date(summary.created_at).toLocaleString()}</div>
        </div> */}
        
        <Tabs defaultValue="summary" value={activetab} onValueChange={setActivetab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {/* <TabsTrigger value="summary" className="data-[state=active]:bg-black data-[state=active]:text-white">{t('summaryTab')}</TabsTrigger> */}
            <TabsTrigger value="summary" >{t('summaryTab')}</TabsTrigger>
            <TabsTrigger value="mindmap" >{t('mindmapTab')}</TabsTrigger>
            <TabsTrigger value="quiz" >{t('quizTab')}</TabsTrigger>
            <TabsTrigger value="transcript" >{t('transcriptTab')}</TabsTrigger>
          </TabsList>
  
          <TabsContent value="summary" 
            forceMount={true} 
            className="data-[state=active]:block hidden m-0 h-full border rounded-lg p-4 mt-2"
          >
            <SummaryDefault
              summary={summary.summary}
              contentLanguage={contentLanguage}
              title={summary.name}
              videoDescription={summary.description}
              transcript={summary.transcript}
              tokenCount={tokenCount}
              videoId={summary.video_id}
              locale={locale}
              folderId={folder?.id}
              onSummaryGenerated={setGeneratedSummaryDefault}
            />
          </TabsContent>

          <TabsContent 
            value="mindmap" 
            forceMount={true} 
            className="p-0 data-[state=inactive]:h-[0.01rem] data-[state=active]:h-[50vh] data-[state=inactive]:opacity-0 data-[state=inactive]:pointer-events-none data-[state=active]:opacity-100 transition-opacity data-[state=inactive]:mt-0 data-[state=active]:mt-2"
            >
            <div className="h-full min-h-[600px] relative z-0">
              <Mindmap 
                summary={generatedSummaryDefault || summary.summary} 
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
            className="data-[state=active]:block hidden p-0"
          >
            <Quiz 
              summary={generatedSummaryDefault || summary.summary} 
              chapters={generatedChapters || summary.chapters}
              quizData={quiz} 
              locale={locale} 
              contentLanguage={contentLanguage}
              summaryId={summaryId || null} 
              title={summary.name}
            />
          </TabsContent>
  
          <TabsContent value="transcript" className="p-0 border-0">
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
  