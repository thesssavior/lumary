import React, { useEffect, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Check, Copy, Loader2, AlertTriangle, FileText } from 'lucide-react'
import { useTranslations } from 'next-intl'

// Constants for transcript-based streaming
const TOKEN_THRESHOLD = 20000;
const FINAL_SEPARATOR = ' <<<OVERVIEW_START>>>';

interface SummaryProps {
  summary: string
  summaryId?: string
  contentLanguage?: string
  chapters?: any[]
  title?: string
  videoDescription?: string
  transcript?: string
  tokenCount?: number
  videoId?: string
  locale?: string
  onSummaryGenerated?: (summary: string) => void
  onSummarySaved?: (summaryData: any) => void
  layout?: 'default' | 'split'
}

const Summary = ({ 
  summary, 
  summaryId, 
  contentLanguage, 
  chapters,
  title,
  videoDescription,
  transcript,
  tokenCount,
  videoId,
  locale,
  onSummaryGenerated,
  onSummarySaved,
  layout = 'default'
}: SummaryProps) => {
  const t = useTranslations('')
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedSummary, setGeneratedSummary] = useState('')
  const [isGenerated, setIsGenerated] = useState(false)
  
  // New state for transcript-based streaming
  const [overviewContent, setOverviewContent] = useState('')
  const [isLongVideo, setIsLongVideo] = useState(false)
  const generationAttemptedRef = useRef(false)

  // Initialize state based on existing summary
  useEffect(() => {
    if (summary) {
      setIsGenerated(true)
      setGeneratedSummary(summary)
    } else {
      setIsGenerated(false)
      setGeneratedSummary('')
    }
  }, [summary])

  // Auto-generation logic (similar to Chapters.tsx)
  useEffect(() => {
    // If we already have a summary, don't auto-generate
    if (summary && summary.trim()) {
      return
    }

    // If no summary but we have transcript, generate directly from transcript
    // This replaces the old new/page.tsx flow
    if (!summary && transcript && !isGenerating && !generationAttemptedRef.current && tokenCount && videoId) {
      generateFromTranscript()
    }
  }, [summary, transcript, tokenCount, videoId, isGenerating])

  const copyToClipboard = () => {
    const textToCopy = isLongVideo && overviewContent 
      ? overviewContent + "\n\n" + (generatedSummary || summary)
      : generatedSummary || summary
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveSummaryContent = async (summaryContent: string) => {
    if (!summaryId) {
      throw new Error('Summary ID is required')
    }

    const response = await fetch('/api/summaries/summarize2', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summaryId: summaryId,
        summary: summaryContent,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to save summary content')
    }

    return await response.json()
  }

  const generateSummary = async () => {
    if (!chapters || !Array.isArray(chapters) || chapters.length === 0 || !transcript) {
      setError('Chapters are required to generate summary')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // Generate summary directly from chapters
      console.log('Generating summary from chapters...')
      const summaryResponse = await fetch('/api/summaries/summarize2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentLanguage: contentLanguage || 'en',
          chapters: chapters,
          title: title,
          videoDescription: videoDescription,
          transcript: transcript,
        }),
      })

      if (!summaryResponse.ok) {
        throw new Error('Failed to generate summary')
      }

      // Read summary stream
      const summaryReader = summaryResponse.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedSummary = ''
      
      if (summaryReader) {
        while (true) {
          const { done, value } = await summaryReader.read()
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          accumulatedSummary += chunk
          setGeneratedSummary(accumulatedSummary)
        }
      }

      if (onSummaryGenerated && accumulatedSummary) {
        onSummaryGenerated(accumulatedSummary)
      }

      setIsGenerated(true)

      // Save summary content to database
      if (accumulatedSummary && summaryId && summaryId !== 'new') {
        setIsSaving(true)
        console.log('Saving summary content to database...')
        const savedData = await saveSummaryContent(accumulatedSummary)
        
        if (onSummarySaved) {
          onSummarySaved(savedData)
        }
      }

    } catch (err: any) {
      console.error('Error generating summary:', err)
      setError(err.message || 'Failed to generate summary')
    } finally {
      setIsGenerating(false)
      setIsSaving(false)
    }
  }

  // Generate summary directly from transcript (replaces new/page.tsx flow)
  const generateFromTranscript = async () => {
    if (!transcript || !tokenCount || !videoId) {
      setError('Transcript, token count, and video ID are required')
      return
    }

    generationAttemptedRef.current = true
    setIsGenerating(true)
    setError(null)
    setGeneratedSummary('')
    setOverviewContent('')

    try {
      const isLongVideo = tokenCount > TOKEN_THRESHOLD
      const summaryApiEndpoint = isLongVideo
        ? '/api/summaries/yt_long'
        : '/api/summaries/summarize'
      setIsLongVideo(isLongVideo)
      console.log(`Using API endpoint: ${summaryApiEndpoint} for token count: ${tokenCount}`)

      const response = await fetch(summaryApiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptText: transcript,
          title: title,
          videoDescription: videoDescription,
          locale: locale || 'en',
          contentLanguage: contentLanguage || 'en',
          tokenCount: tokenCount,
          videoId: videoId,
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to generate summary')
      }
      if (!response.body) {
        throw new Error('Empty response stream')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let content = ''
      let fullSummary = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          if (isLongVideo) {
            const separatorIndex = content.indexOf(FINAL_SEPARATOR)
            setOverviewContent(content.slice(separatorIndex + FINAL_SEPARATOR.length))
            setGeneratedSummary(content.slice(0, separatorIndex))
            fullSummary = content.slice(separatorIndex + FINAL_SEPARATOR.length) + content.slice(0, separatorIndex)
          } else {
            setGeneratedSummary(content)
            fullSummary = content
          }
          break
        }
        const chunk = decoder.decode(value)
        content += chunk
        setGeneratedSummary(prev => prev + chunk)
      }

      if (onSummaryGenerated && fullSummary) {
        onSummaryGenerated(fullSummary)
      }

      setIsGenerated(true)

    } catch (err: any) {
      console.error('Error generating summary from transcript:', err)
      setError(err.message || 'Failed to generate summary')
      generationAttemptedRef.current = false // Reset on error to allow retry
    } finally {
      setIsGenerating(false)
    }
  }

  const hasContent = chapters && Array.isArray(chapters) && chapters.length > 0
  const displaySummary = generatedSummary || summary
  const isDefaultLayout = layout === 'default'

  // Loading state (block UI only when not streaming inline in default layout)
  const showBlockingLoader = (isGenerating || isSaving) && !(isDefaultLayout && isGenerating && !summary && transcript)
  if (showBlockingLoader) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-6 rounded-md">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <h3 className="text-xl font-semibold mb-2">
          {isGenerating && t('Summary.generatingSummary')}
          {isSaving && !isGenerating && t('Summary.savingSummary')}
        </h3>
        <p className="text-sm text-gray-500 text-center max-w-md">
          {isGenerating && t('Summary.generatingSummaryDescription')}
          {isSaving && !isGenerating && t('Summary.savingSummaryDescription')}
        </p>
      </div>
    )
  }

  // Error state
  if (error && !isGenerated) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-6 rounded-md bg-red-50 text-red-700">
        <AlertTriangle className="h-10 w-10 mb-3" />
        <p className="font-semibold">{t('Summary.errorTitle')}</p>
        <p className="text-sm mb-4 text-center">{error}</p>
        <Button 
          onClick={generateSummary}
          variant="outline"
          disabled={!hasContent || isGenerating}
        >
          Try Again
        </Button>
      </div>
    )
  }

  // Empty state - no summary generated yet
  if (!displaySummary && !isGenerating && !isSaving) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-10 text-center rounded-md">
        <FileText className="h-12 w-12 mb-6" />
        <h3 className="text-xl font-semibold mb-2">{t('Summary.generateTitle')}</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-md">
          {t('Summary.generateDescription')}
        </p>
        <Button 
          onClick={generateSummary}
          size="lg"
          disabled={!hasContent || isGenerating}
        >
          {t('Summary.generateButton')}
        </Button>
        {!hasContent && (
          <p className="text-xs text-red-500 mt-2">{t('Summary.chaptersRequired')}</p>
        )}
        {error && (
          <div className="mt-4 text-sm text-red-600">
            <p>{t('Summary.lastAttemptError')}: {error}</p>
          </div>
        )}
      </div>
    )
  }

  // Generated summary display
  return (
    <div className="space-y-4">
      {/* Overview content for long videos */}
      {overviewContent && (
        <div className="prose prose-zinc max-w-none p-4 pr-16 rounded-lg relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="absolute top-4 right-4 h-8 w-8 p-0 hover:bg-gray-100"
            title={copied ? t('copiedToClipboard') : t('copySummary')}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <div className="text-foreground [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg [&>p]:text-base [&>ul]:list-disc [&>ol]:list-decimal [&>li]:ml-4 [&>h1]:mb-6 [&>h1:not(:first-child)]:mt-10 [&>h2]:mb-5 [&>h2:not(:first-child)]:mt-8 [&>h3]:mb-4 [&>h3:not(:first-child)]:mt-6 [&>p]:mb-5 [&>ul]:mb-5 [&>ol]:mb-5 [&>li]:mb-3 [&>ol]:pl-8 [&>ul]:pl-8 [&>strong]:font-bold">
            <ReactMarkdown>{overviewContent}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Main summary content */}
      <div className="prose prose-zinc max-w-none p-4 pr-16 rounded-lg relative">
        {!overviewContent && (
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
        )}
        
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm mb-4">
            <p><span className="font-semibold">Error encountered:</span> {error}</p>
          </div>
        )}
        
        <div className="text-foreground [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg [&>p]:text-base [&>ul]:list-disc [&>ol]:list-decimal [&>li]:ml-4 [&>h1]:mb-6 [&>h1:not(:first-child)]:mt-10 [&>h2]:mb-5 [&>h2:not(:first-child)]:mt-8 [&>h3]:mb-4 [&>h3:not(:first-child)]:mt-6 [&>p]:mb-5 [&>ul]:mb-5 [&>ol]:mb-5 [&>li]:mb-3 [&>ol]:pl-8 [&>ul]:pl-8 [&>strong]:font-bold">
          <ReactMarkdown>{displaySummary}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

export default Summary