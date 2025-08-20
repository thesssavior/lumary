import React, { useState, useEffect, useRef } from 'react'
import { Loader2, Clock, Tag, ChevronDown, ChevronUp } from 'lucide-react'
import { useVideoPlayer } from '@/contexts/VideoPlayerContext'
import { useTranslations } from 'next-intl'
import { formatTimeString, timeStringToSeconds } from '@/lib/utils'

interface ChapterData {
  start_time: string | number
  heading: string
  summary: string
  keywords: string | string[]
}

interface ChaptersProps {
  chapters?: string
  transcript?: string
  summaryId?: string
  contentLanguage?: string
  // Additional props needed for creating initial summary record
  videoId?: string
  folderId?: string
  title?: string
  videoDescription?: string
  locale?: string
  tokenCount?: number
  onSummaryCreated?: (summaryData: any) => void
  onChaptersGenerated?: (chaptersData: ChapterData[]) => void
  layout?: 'default' | 'split'
}

const Chapters = ({ 
  chapters: initialChapters, 
  transcript, 
  summaryId, 
  contentLanguage,
  videoId,
  folderId,
  title,
  videoDescription,
  locale,
  tokenCount,
  onSummaryCreated,
  onChaptersGenerated,
  layout
}: ChaptersProps) => {
  const [chaptersText, setChaptersText] = useState(initialChapters || '')
  const [parsedChapters, setParsedChapters] = useState<ChapterData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isCreatingSummary, setIsCreatingSummary] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isTocExpanded, setIsTocExpanded] = useState(true)
  const creationAttemptedRef = useRef(false)
  const t=useTranslations('Chapters')

  // Try to get video player context, but don't require it
  let videoPlayer: ReturnType<typeof useVideoPlayer> | null = null;
  try {
    videoPlayer = useVideoPlayer();
  } catch (error) {
    // Context not available, chapters won't be clickable
    videoPlayer = null;
  }

  // Handle chapter click to seek to timestamp
  const handleChapterClick = (startTime: string | number) => {
    if (videoPlayer) {
      videoPlayer.seekTo(timeStringToSeconds(startTime));
    }
  };

  // More aggressive parsing that works with incomplete JSON
  const parseIncrementalChapters = (text: string): ChapterData[] => {
    if (!text.trim()) return []
    
    // Clean markdown formatting if present
    let cleanedText = text.trim()
    
    // Remove markdown code block formatting
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    try {
      // First, try to parse complete JSON
      const parsed = JSON.parse(cleanedText)
      if (Array.isArray(parsed)) {
        return parsed
      }
    } catch (e) {
      // If that fails, try to extract complete chapter objects from incomplete JSON
    }

    // Extract individual chapter objects using regex
    const chapterMatches = cleanedText.match(/\{[^{}]*"start_time"[^{}]*"heading"[^{}]*"summary"[^{}]*"keywords"[^{}]*\}/g)
    
    if (!chapterMatches) return []

    const chapters: ChapterData[] = []
    
    for (const match of chapterMatches) {
      try {
        const chapter = JSON.parse(match)
        if (chapter.start_time !== undefined && chapter.heading && chapter.summary && chapter.keywords) {
          chapters.push(chapter)
        }
      } catch (e) {
        // Skip malformed chapters
        continue
      }
    }
    
    return chapters
  }

  // Parse chapters whenever chaptersText changes, but only update if we have new complete chapters
  const prevChaptersLengthRef = useRef(parsedChapters.length);
  useEffect(() => {
    if (chaptersText.trim()) {
      const parsed = parseIncrementalChapters(chaptersText)
      // Only update if we have more complete chapters than before
      if (parsed.length > parsedChapters.length) {
        setParsedChapters(parsed)
      }
    }
  }, [chaptersText, parsedChapters.length])

  // When parsedChapters updates, notify the parent if there are new chapters.
  useEffect(() => {
    if (parsedChapters.length > prevChaptersLengthRef.current) {
      if (onChaptersGenerated) {
        onChaptersGenerated(parsedChapters);
      }
    }
    prevChaptersLengthRef.current = parsedChapters.length;
  }, [parsedChapters, onChaptersGenerated]);

  useEffect(() => {
    // If we already have chapters, don't fetch
    if (initialChapters && initialChapters.trim()) {
      setChaptersText(initialChapters)
      // Use the parseIncrementalChapters function instead of direct JSON.parse
      const parsed = parseIncrementalChapters(initialChapters)
      setParsedChapters(parsed)
      return
    }

    // If no chapters but we have transcript, generate chapters
    // Add guards to prevent duplicate calls
    if (!initialChapters && transcript && !isGenerating && !creationAttemptedRef.current) {
      generateChapters()
    }
  }, [initialChapters, transcript])

  const generateChapters = async () => {
    if (!transcript) {
      setError('Transcript is required to generate chapters')
      return
    }

    // Set flag immediately to prevent duplicate calls
    creationAttemptedRef.current = true
    setIsGenerating(true)
    setError(null)
    setParsedChapters([])
    
    try {
      // Step 1: Generate chapters first
      console.log('Generating chapters...')
      const response = await fetch('/api/summaries/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript, 
          contentLanguage: contentLanguage || 'ko',
          tokenCount: tokenCount,
          videoTitle: title,
          videoDescription: videoDescription
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate chapters')
      }

      // Stream chapters and accumulate them
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedChapters = ''
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          accumulatedChapters += chunk
          
          // Only update UI every 5 chunks or if we detect a complete chapter
          const shouldUpdate = chunk.includes('}')
          
          if (shouldUpdate) {
            setChaptersText(accumulatedChapters)
          }
        }
        
        // Final update with complete content
        setChaptersText(accumulatedChapters)
      }

      // Step 2: After generation complete, decide save strategy
      const isNewSummary = summaryId === 'new' || !summaryId

      if (isNewSummary && folderId && videoId && title) {
        // Create complete summary record with all data
        console.log('Creating new summary record with all data...')
        await createInitialSummaryRecord(accumulatedChapters)
      } else if (summaryId && summaryId !== 'new' && accumulatedChapters.trim()) {
        // Only save chapters to existing summary
        console.log('Saving chapters to existing summary...')
        await saveChaptersOnly(accumulatedChapters)
      }

    } catch (err: any) {
      console.error('Error generating chapters:', err)
      setError(err.message || 'Failed to generate chapters')
      // Reset flag on error so it can be retried
      creationAttemptedRef.current = false
    } finally {
      setIsGenerating(false)
      setIsCreatingSummary(false)
    }
  }

  const createInitialSummaryRecord = async (chaptersData: string) => {
    if (!folderId || !videoId || !title) return
    
    // Check if summary creation has already been attempted
    if (creationAttemptedRef.current) {
      console.log('Summary creation already attempted, skipping...')
      return
    }
    
    // Check if summary is already being created or exists
    if (isCreatingSummary) {
      console.log('Summary creation already in progress, skipping...')
      return
    }

    // Mark creation as attempted to prevent duplicate calls
    creationAttemptedRef.current = true
    setIsCreatingSummary(true)
    
    try {
      const response = await fetch(`/api/folders/${folderId}/summaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: videoId,
          name: title,
          title: title,
          transcript: transcript,
          description: videoDescription,
          locale: locale,
          contentLanguage: contentLanguage,
          chapters: chaptersData, // Save the generated chapters
          input_token_count: tokenCount,
          layout: layout || 'split',
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create summary record')
      }

      const newSummary = await response.json()
      console.log('Initial summary record created:', newSummary)
      
      if (onSummaryCreated) {
        onSummaryCreated(newSummary)
      }

    } catch (err: any) {
      console.error('Error creating summary record:', err)
      setError(`Failed to create summary: ${err.message}`)
      // Reset the flag on error so it can be retried
      creationAttemptedRef.current = false
    } finally {
      setIsCreatingSummary(false)
    }
  }

  const saveChaptersOnly = async (chaptersData: string) => {
    try {
      const response = await fetch('/api/summaries/chapters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summaryId: summaryId,
          chapters: chaptersData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save chapters')
      }

      console.log('Chapters saved successfully')
    } catch (err: any) {
      console.error('Error saving chapters:', err)
      throw err
    }
  }



  if (isGenerating && parsedChapters.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-gray-600 dark:text-gray-300">Generating chapters...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-500 dark:text-red-400 p-4">
        {error}
      </div>
    )
  }

  if (parsedChapters.length === 0 && !isGenerating) {
    return (
      <div className="text-gray-500 dark:text-gray-400 p-4">
        No chapters available
      </div>
    )
  }

  return (
    <div className="prose prose-zinc dark:prose-invert max-w-none p-2 pr-16 relative h-full">
      {/* Video Title Heading */}
      {title && (
        <div className="p-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h1>
        </div>
      )}

      {/* Table of Contents */}
      {parsedChapters.length > 0 && (
        <div className="mb-2 rounded-lg p-2">
          <div 
            className="flex items-center cursor-pointer p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setIsTocExpanded(!isTocExpanded)}
          >
            <h2 className="text-lg font-semibold my-2 text-gray-900 dark:text-gray-100">{t('tableOfContents')}</h2>

            {isTocExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            )}
            
          </div>
          {isTocExpanded && (
            <div className="">
              {parsedChapters.map((chapter, index) => (
                <div 
                  key={`toc-${index}`}
                  className={`flex items-center gap-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded ${videoPlayer ? 'cursor-pointer' : ''}`}
                  onClick={() => handleChapterClick(chapter.start_time)}
                >
                  <span className="text-sm min-w-[20px] text-gray-700 dark:text-gray-300">{index + 1}.</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {chapter.heading}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chapters List */}
      <div className="space-y-2">
        {/* {(isGenerating && parsedChapters.length > 0) && (
            <div className="flex items-center text-sm mb-4 bg-blue-50 p-2 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Generating more chapters... ({parsedChapters.length} so far)
            </div>
        )}
        
        {isCreatingSummary && (
            <div className="flex items-center text-sm mb-4 bg-green-50 p-2 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Saving summary record...
            </div>
        )} */}
        
        {parsedChapters.map((chapter, index) => (
            <div 
              key={index} 
              className={`rounded-lg p-4 bg-background border border-gray-200 dark:border-none text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${videoPlayer ? 'cursor-pointer' : ''}`}
              onClick={() => handleChapterClick(chapter.start_time)}
            >
                <div className="flex items-start">
                    <div className="flex-1">
                        {/* timestamp and heading */}
                        <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-1 font-normal text-primary dark:text-primary">
                                {formatTimeString(chapter.start_time)}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {chapter.heading}
                            </h3>
                        </div>

                        {/* keywords */}
                        {/* {chapter.keywords && (
                          <div className="flex items-center gap-2 mb-2">
                              <div className="flex flex-wrap gap-1">
                                  {(() => {
                                    // Handle both string and array formats
                                    let keywordsList: string[] = [];
                                    
                                    if (typeof chapter.keywords === 'string') {
                                      try {
                                        // Try to parse as JSON array first
                                        const parsed = JSON.parse(chapter.keywords);
                                        if (Array.isArray(parsed)) {
                                          keywordsList = parsed;
                                        } else {
                                          // Fall back to comma-separated string
                                          keywordsList = chapter.keywords.split(',');
                                        }
                                      } catch {
                                        // If JSON parse fails, treat as comma-separated string
                                        keywordsList = chapter.keywords.split(',');
                                      }
                                    } else if (Array.isArray(chapter.keywords)) {
                                      keywordsList = chapter.keywords;
                                    }
                                    
                                    return keywordsList.map((keyword, keyIndex) => (
                                      <span 
                                        key={keyIndex}
                                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                                      >
                                        {keyword.trim()}
                                      </span>
                                    ));
                                  })()}
                              </div>
                          </div>
                        )} */}

                        {/* summary */}
                        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                            {chapter.summary}
                        </p>
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  )
}

export default Chapters