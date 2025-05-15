"use client";

import { useEffect, useState, useContext, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSummaryGeneration } from '@/contexts/SummaryGenerationContext';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import { Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarRefreshContext } from '@/components/SidebarLayout';
import { FullTranscriptViewer } from "@/components/FullTranscriptViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollToTopButton } from '@/components/ScrollToTopButton';

// Define a threshold for switching to the long video API
const TOKEN_THRESHOLD = 20000; // Example value, adjust as needed
const FINAL_SEPARATOR = ' <<<OVERVIEW_START>>>';

// Assuming FolderType might be used for persistedFolder, define a placeholder if not imported
type FolderType = any; 

export default function NewSummaryPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const { generationData, setGenerationData } = useSummaryGeneration();
  const refreshSidebar = useContext(SidebarRefreshContext);
  
  const [fullContent, setFullContent] = useState('');
  const [overviewContent, setOverviewContent] = useState('');
  const [streamingSummaryContent, setStreamingSummaryContent] = useState('');
  // Persisted state for display after context is cleared
  const [persistedTitle, setPersistedTitle] = useState<string | null>(null);
  const [persistedFolder, setPersistedFolder] = useState<FolderType | null>(null);
  const [persistedTranscriptText, setPersistedTranscriptText] = useState<string | null>(null);

  const [isLongVideo, setIsLongVideo] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const fetchInitiatedForVideoIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentTranscriptData = generationData.transcriptData;
    const currentFolderForSummary = generationData.folderForSummary;

    if (currentTranscriptData) {
      // Persist data for display
      setPersistedTitle(currentTranscriptData.title);
      setPersistedFolder(currentFolderForSummary);
      setPersistedTranscriptText(currentTranscriptData.transcriptText);

      // Core decision logic for streaming:
      if (fetchInitiatedForVideoIdRef.current !== currentTranscriptData.videoId) {
        // This condition means it's a new video ID, or we haven't successfully initiated a fetch for it yet.
        if (!isStreaming && !error) { // Only proceed if not already streaming and no critical error prevents start
          console.log("New videoId detected or retry allowed. Preparing to stream for videoId:", currentTranscriptData.videoId);
          
          setStreamingSummaryContent(''); // Clear any previous summary content
          setShowSuccessMessage(false);   // Reset success message
          
          // IMPORTANT: Mark that a fetch is being initiated for THIS videoId.
          // This prevents re-entry if useEffect runs again before isStreaming is set to true.
          fetchInitiatedForVideoIdRef.current = currentTranscriptData.videoId;

          // Define the streaming operation locally to capture the correct currentTranscriptData and currentFolderForSummary
          const streamSummaryOperation = async () => {
            setIsStreaming(true);
            setError(null); // Clear previous errors before starting
            
            try {
              // Use the captured currentTranscriptData for this operation
              const {
                tokenCount, 
                videoId,
                locale: videoLocale, 
                transcriptText, 
                title, 
                videoDescription,
              } = currentTranscriptData;

              const isLongVideo = tokenCount > TOKEN_THRESHOLD;
              const summaryApiEndpoint = isLongVideo
                ? '/api/yt_long'
                : '/api/summarize';
              setIsLongVideo(isLongVideo);
              console.log(`Using API endpoint: ${summaryApiEndpoint} for token count: ${tokenCount}`);

              const response = await fetch(summaryApiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  transcriptText: transcriptText,
                  title: title,
                  videoDescription: videoDescription,
                  locale: videoLocale,
                  tokenCount: tokenCount,
                  videoId: videoId,
                }),
              });

              if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || t('errorGeneratingSummary'));
              }
              if (!response.body) {
                throw new Error(t('emptyResponseStream'));
              }

              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let content = '';
              let fullSummary = ''; // Declare fullSummary here
              // The streamingSummaryContent was reset before this operation started.
              // The heuristic check for title !== persistedTitle inside the loop is removed
              // as new video/data handling is now managed by fetchInitiatedForVideoIdRef.

              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  if (isLongVideo) {
                    const separatorIndex = content.indexOf(FINAL_SEPARATOR);
                    setOverviewContent(content.slice(separatorIndex + FINAL_SEPARATOR.length));
                    setStreamingSummaryContent(content.slice(0, separatorIndex));
                    fullSummary = content.slice(separatorIndex + FINAL_SEPARATOR.length) + content.slice(0, separatorIndex); // Assign to the outer scope variable
                  } else {
                    setStreamingSummaryContent(content);
                    setOverviewContent('');
                    fullSummary = content;
                  }
                  break;
                };
                const chunk = decoder.decode(value);
                content += chunk;
                setStreamingSummaryContent(prev => prev + chunk); // Continue progressive display
              }

              saveSummary(fullSummary, currentTranscriptData, currentFolderForSummary);
            } catch (err: any) {
              console.error("Streaming error:", err);
              setError(err.message || t('errorGeneratingSummary'));
              // If an error occurred during streaming for THIS videoId,
              // reset the ref to allow a retry if conditions change (e.g., error cleared, new generationData for same videoId).
              if (fetchInitiatedForVideoIdRef.current === currentTranscriptData.videoId) {
                fetchInitiatedForVideoIdRef.current = null; 
              }
            } finally {
              setIsStreaming(false);
            }
          };
          streamSummaryOperation(); // Execute the defined streaming operation
        }
      } else {
        // fetchInitiatedForVideoIdRef.current === currentTranscriptData.videoId
        // A fetch has already been initiated for this videoId.
        // Log current status; typically, no new stream should start unless it's an explicit retry logic (handled by ref reset on error).
        if (isStreaming) {
            console.log("Stream is already in progress for videoId:", currentTranscriptData.videoId);
        } else if (error) {
            console.log("Error state exists for videoId:", currentTranscriptData.videoId, "Error:", error);
        } else if (streamingSummaryContent) {
            console.log("Content already available or stream completed for videoId:", currentTranscriptData.videoId);
        } else {
            console.log("Fetch initiated for videoId:", currentTranscriptData.videoId, "but no content, not streaming, and no error. Waiting or previous attempt incomplete.");
        }
      }
    } else { // transcriptData from context is null (e.g., after save, or on initial load with no data)
      // If context is cleared (e.g. post-save) and the page is in a "clean" state
      // (no persisted title, no streaming content, not streaming, no error, no success message showing),
      // then reset fetchInitiatedForVideoIdRef. This allows a new video to be processed
      // if the user navigates back to /new or new data is provided.
      if (!persistedTitle && !streamingSummaryContent && !isStreaming && !error && !showSuccessMessage) {
        console.log("Context is null and page is clear. Resetting fetchInitiatedForVideoIdRef.");
        // fetchInitiatedForVideoIdRef.current = null;
      }
    }
  }, [generationData, isStreaming, error, t, persistedTitle, showSuccessMessage]); // Removed streamingSummaryContent

  const saveSummary = async (fullSummaryText: string, dataToSave: any, folderToSave: any) => {
    // Ensure we use the data that was actually used for generation for saving
    if (!dataToSave) {
      setError(t('missingDataSave'));
      return;
    }
    // setShowSuccessMessage(false); // Not here, set true on actual success
    if (!folderToSave) {
      console.log("No folder selected (or user is guest). Summary generated but not saved to DB.");
      // Still show the summary content locally
      setPersistedTitle(dataToSave.title); // Ensure persisted title is set from dataToSave
      // folderToSave is null, so persistedFolder would be null or remain as is.
      setShowSuccessMessage(true); // Show success for generation, even if not saved to DB
      setIsSaving(false); // Ensure saving is false
      return; 
    }
    const {tokenCount, videoId, locale: videoLocale, transcriptText, title, videoDescription, fetcher} = dataToSave;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/folders/${folderToSave.id}/summaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: videoId,
          summary: fullSummaryText,
          title: title,
          input_token_count: tokenCount,
          transcript: transcriptText,
          description: videoDescription,
          locale: videoLocale,
          fetcher: fetcher,
          name: title
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || t('errorSavingSummary'));
      }
      const savedSummaryData = await response.json(); 
      const newSummaryId = savedSummaryData.id;
      if (!newSummaryId) throw new Error(t('errorNoSummaryId'));
      
      if (refreshSidebar) refreshSidebar();
      setGenerationData({ transcriptData: null, folderForSummary: null }); // Clear context
      setShowSuccessMessage(true); // Show success message
      // Persisted states (persistedTitle, persistedFolder, streamingSummaryContent) will remain.
    } catch (err: any) {
      console.error("Saving error:", err);
      setError(err.message || t('errorSavingSummary'));
    } finally {
      setIsSaving(false);
    }
  };
  
  // Determine what title to display (persisted or default)
  const currentDisplayTitle = persistedTitle || t('untitledSummary');

  // Condition for showing the main content (summary, tabs, etc.)
  const showMainContent = (persistedTitle || streamingSummaryContent) && !error;
  // Condition for showing loading skeletons
  const showLoadingSkeleton = !persistedTitle && !streamingSummaryContent && !isStreaming && !error && !showSuccessMessage;


  if (showLoadingSkeleton) {
    return (
      <div className="flex justify-center items-center h-full">
        <Skeleton className="w-1/2 h-12" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <ScrollToTopButton />
      
      {/* {showSuccessMessage && ( // Simpler condition for success message
        <Card className="p-4 bg-green-50 border-green-200 text-green-700">
          <p className="font-semibold">{t('summarySavedSuccess')}</p>
        </Card>
      )} */}

      {showMainContent && (
        <>
          <div className="space-y-2">
            {persistedFolder && (
              <div className="flex items-center text-sm text-gray-500">
                <Folder className="w-4 h-4 mr-2" />
                <span>{persistedFolder.name}</span>
                <span className="mx-1">/</span>
              </div>
            )}
            <h1 className="text-4xl font-bold my-4">{currentDisplayTitle}</h1>
            {(isStreaming || isSaving) && !error && (
              <p className="text-sm text-gray-500">
                {isStreaming && t('generatingSummaryWait')}
                {isSaving && !isStreaming && t('savingSummaryWait')}
              </p>
            )}
          </div>

          {error && (
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-red-700 font-semibold">{t('errorOccurred')}</p>
              <p className="text-red-600 text-sm">{error}</p>
              <Button variant="outline" onClick={() => router.push(`/${locale}`)} className="mt-4">
                {t('goBackHome')}
              </Button>
            </Card>
          )}

          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">{t('summaryTab')}</TabsTrigger>
              <TabsTrigger value="transcript">{t('transcriptTab')}</TabsTrigger>
              <TabsTrigger value="mindmap">{t('mindmapTab')}</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-6 p-0 border-0">
              {isLongVideo && isStreaming && !overviewContent ? (
                <div className="prose prose-zinc max-w-none p-6 border rounded-md bg-gray-50">
                  <Skeleton className="h-6 w-3/4 mb-6" /> {/* Placeholder for title */}
                  <Skeleton className="h-4 w-full mb-3" /> {/* Placeholder for text */}
                  <Skeleton className="h-4 w-full mb-3" /> {/* Placeholder for text */}
                  <Skeleton className="h-4 w-full mb-3" /> {/* Placeholder for text */}
                </div>
              ) : (
                overviewContent && (
                  <div className="prose prose-zinc max-w-none p-6 border rounded-md">
                    <div className="text-black [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg [&>p]:text-base [&>ul]:list-disc [&>ol]:list-decimal [&>li]:ml-4 [&>h1]:mb-6 [&>h1:not(:first-child)]:mt-10 [&>h2]:mb-5 [&>h2:not(:first-child)]:mt-8 [&>h3]:mb-4 [&>h3:not(:first-child)]:mt-6 [&>p]:mb-5 [&>ul]:mb-5 [&>ol]:mb-5 [&>li]:mb-3 [&>ol]:pl-8 [&>ul]:pl-8 [&>strong]:font-bold [&>strong]:text-black">
                      <ReactMarkdown>{overviewContent}</ReactMarkdown>
                    </div>
                  </div>
                )
              )}
              {(isStreaming && !streamingSummaryContent) && (
                <div className="space-y-4 p-6 border rounded-md">
                  <Skeleton className="h-6 w-3/4 mb-6" />
                  <Skeleton className="h-4 w-full mb-3" />
                  <Skeleton className="h-4 w-full mb-3" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              )}
              {streamingSummaryContent && (
                <div className="prose prose-zinc max-w-none p-6 border rounded-md">
                   <div className="text-black [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg [&>p]:text-base [&>ul]:list-disc [&>ol]:list-decimal [&>li]:ml-4 [&>h1]:mb-6 [&>h1:not(:first-child)]:mt-10 [&>h2]:mb-5 [&>h2:not(:first-child)]:mt-8 [&>h3]:mb-4 [&>h3:not(:first-child)]:mt-6 [&>p]:mb-5 [&>ul]:mb-5 [&>ol]:mb-5 [&>li]:mb-3 [&>ol]:pl-8 [&>ul]:pl-8 [&>strong]:font-bold [&>strong]:text-black">
                      <ReactMarkdown>{streamingSummaryContent}</ReactMarkdown>
                  </div>
                </div>
              )}
              {/* Fallback if not streaming and no content, but main content is shown (e.g. error occurred before stream) */}
              {(!isStreaming && !streamingSummaryContent && persistedTitle && !error) && (
                  <p className="text-gray-500 p-6 border rounded-md">{t('summaryWillAppearHere')}</p>
              )}
            </TabsContent>

            <TabsContent value="transcript" className="mt-4 p-0 border-0">
              {persistedTranscriptText ? (
                <div className="p-4 border rounded-md">
                  <FullTranscriptViewer transcript={persistedTranscriptText} />
                </div>
              ) : (
                <p className="text-gray-500 p-6 border rounded-md">No transcript data available.</p>
              )}
            </TabsContent>

            <TabsContent value="mindmap" className="mt-4 p-0 border-0">
              <p className="text-gray-500 p-6 border rounded-md">Mindmap coming soon!</p>
            </TabsContent>
          </Tabs>
        </>
      )}
      {/* Fallback for when no main content and not loading skeleton, e.g. error state without persistedTitle */}
      {!showMainContent && !showLoadingSkeleton && error && (
         <div className="flex justify-center items-center h-full p-6 border rounded-md">
            <p className="text-gray-500">An error occurred. Please try again.</p> {/* Or show full error card */}
         </div>
      )}
       {!showMainContent && !showLoadingSkeleton && !error && !showSuccessMessage && (
         <div className="flex justify-center items-center h-full p-6 border rounded-md">
            <p className="text-gray-500">Loading summary data or no data available...</p>
         </div>
      )}
    </div>
  );
} 