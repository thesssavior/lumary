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
import Summary from './yt_videos/Summary';
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
    const [activetab, setActivetab] = useState("chapters");
    const [generatedChapters, setGeneratedChapters] = useState<any[] | null>(null);
    const [generatedSummary, setGeneratedSummary] = useState('');
    
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
          <div className="w-full bg-gray-50" style={{ height: 'calc(100vh - 4.2rem)' }}>
                          <ResizablePanelGroup ref={horizontalPanelGroupRef} direction="horizontal" className="h-full">
                {/* Left Panel */}
                <ResizablePanel defaultSize={46} minSize={25}>
                  <ResizablePanelGroup ref={verticalPanelGroupRef} direction="vertical" className="h-full">
                    {/* Video Player - Top Left */}
                    <ResizablePanel defaultSize={54} minSize={25} className="p-1">
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
                <div className="h-full bg-white border overflow-hidden rounded-lg">
                  <div className="h-full flex flex-col">

                    {/* Tabs Content - Only Summary, Mindmap, Quiz (no transcript) */}
                    <div className="flex-1 overflow-hidden">
                      <Tabs defaultValue="chapters" value={activetab} onValueChange={setActivetab} className="h-full flex flex-col">
                        <div className="flex items-center gap-2 mx-2 mt-2 mb-0 flex-shrink-0">
                          {/* Tabs */}
                          <TabsList className="grid grid-cols-4 flex-1">
                            <TabsTrigger value="chapters">{t('chaptersTab')}</TabsTrigger>
                            <TabsTrigger value="summary">{t('summaryTab')}</TabsTrigger>
                            <TabsTrigger value="mindmap">{t('mindmapTab')}</TabsTrigger>
                            <TabsTrigger value="quiz">{t('quizTab')}</TabsTrigger>
                          </TabsList>
                          
                          {/* Reset layout button */}
                          <button
                            onClick={resetLayout}
                            className="flex items-center gap-1 px-1 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                            title="Reset layout to default sizes"
                          >
                            <RotateCcw className="h-4 w-4 text-gray-500" />
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
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </VideoPlayerProvider>
      );
    }

    // Default layout mode (original)
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 h-full overflow-auto">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Folder className="w-4 h-4" />
          <span>{folder.name}</span>
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
            className="data-[state=active]:block hidden p-0"
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
            className="data-[state=active]:block hidden p-0"
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
  