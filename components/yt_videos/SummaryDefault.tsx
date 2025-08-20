import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Check, Copy, Loader2, AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'

const TOKEN_THRESHOLD = 20000
const FINAL_SEPARATOR = ' <<<OVERVIEW_START>>>'

type SummaryDefaultProps = {
  summary: string
  contentLanguage?: string
  title?: string
  videoDescription?: string
  transcript?: string
  tokenCount?: number
  videoId?: string
  locale?: string
  folderId: string
  onSummaryGenerated?: (summary: string) => void
}

export default function SummaryDefault({
  summary,
  contentLanguage,
  title,
  videoDescription,
  transcript,
  tokenCount,
  videoId,
  locale,
  folderId,
  onSummaryGenerated,
}: SummaryDefaultProps) {
  const t = useTranslations('')
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedSummary, setGeneratedSummary] = useState('')
  const [isGenerated, setIsGenerated] = useState(false)
  const [overviewContent, setOverviewContent] = useState('')
  const [isLongVideo, setIsLongVideo] = useState(false)
  const generationAttemptedRef = useRef(false)

  useEffect(() => {
    if (summary) {
      setIsGenerated(true)
      setGeneratedSummary(summary)
    } else {
      setIsGenerated(false)
      setGeneratedSummary('')
    }
  }, [summary])

  useEffect(() => {
    if (summary && summary.trim()) return
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

  const saveNewSummaryRecord = async (fullSummaryText: string) => {
    if (!folderId) throw new Error('Folder ID is required to save')
    if (!videoId || !title) throw new Error('Video ID and title are required to save')

    const response = await fetch(`/api/folders/${folderId}/summaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId: videoId,
        summary: fullSummaryText,
        title: title,
        input_token_count: tokenCount || 0,
        transcript: transcript,
        description: videoDescription,
        locale: locale,
        contentLanguage: contentLanguage || locale,
        name: title,
        layout: 'default',
      }),
    })

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.error || 'Failed to save summary')
    }

    return await response.json()
  }

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
      const longVideo = tokenCount > TOKEN_THRESHOLD
      const summaryApiEndpoint = longVideo ? '/api/summaries/yt_long' : '/api/summaries/summarize'
      setIsLongVideo(longVideo)

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
          if (longVideo) {
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

      setIsGenerated(true)

      // Call the callback to share generated content with parent
      if (onSummaryGenerated && fullSummary) {
        onSummaryGenerated(fullSummary)
      }

      if (fullSummary) {
        try {
          setIsSaving(true)
          await saveNewSummaryRecord(fullSummary)
        } finally {
          setIsSaving(false)
        }
      }

    } catch (err: any) {
      console.error('Error generating summary from transcript (default):', err)
      setError(err.message || 'Failed to generate summary')
      generationAttemptedRef.current = false
    } finally {
      setIsGenerating(false)
    }
  }

  const hasContent = Boolean(transcript)
  const displaySummary = generatedSummary || summary

  const showBlockingLoader = (isGenerating || isSaving) && !(isGenerating && !summary && transcript)
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

  if (error && !isGenerated) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-6 rounded-md bg-red-50 text-red-700">
        <AlertTriangle className="h-10 w-10 mb-3" />
        <p className="font-semibold">{t('Summary.errorTitle')}</p>
        <p className="text-sm mb-4 text-center">{error}</p>
        <Button onClick={generateFromTranscript} variant="outline" disabled={!hasContent || isGenerating}>
          Try Again
        </Button>
      </div>
    )
  }

  if (!displaySummary && !isGenerating && !isSaving) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-10 text-center rounded-md">
        <p className="text-sm text-gray-500 mb-6 max-w-md">{t('Summary.generateDescription')}</p>
        <Button onClick={generateFromTranscript} size="lg" disabled={!hasContent || isGenerating}>
          {t('Summary.generateButton')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {overviewContent && (
        <div className="prose prose-zinc max-w-none p-4 pr-16 rounded-lg relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="absolute top-4 right-4 h-8 w-8 p-0 hover:bg-gray-100"
            title={copied ? t('copiedToClipboard') : t('copySummary')}
          >
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </Button>
          <div className="text-foreground [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg [&>p]:text-base [&>ul]:list-disc [&>ol]:list-decimal [&>li]:ml-4 [&>h1]:mb-6 [&>h1:not(:first-child)]:mt-10 [&>h2]:mb-5 [&>h2:not(:first-child)]:mt-8 [&>h3]:mb-4 [&>h3:not(:first-child)]:mt-6 [&>p]:mb-5 [&>ul]:mb-5 [&>ol]:mb-5 [&>li]:mb-3 [&>ol]:pl-8 [&>ul]:pl-8 [&>strong]:font-bold">
            <ReactMarkdown>{overviewContent}</ReactMarkdown>
          </div>
        </div>
      )}

      <div className="prose prose-zinc max-w-none p-4 pr-16 rounded-lg relative">
        {!overviewContent && (
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="absolute top-4 right-4 h-8 w-8 p-0 hover:bg-gray-100"
            title={copied ? t('copiedToClipboard') : t('copySummary')}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        )}
        <div className="text-foreground [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg [&>p]:text-base [&>ul]:list-disc [&>ol]:list-decimal [&>li]:ml-4 [&>h1]:mb-6 [&>h1:not(:first-child)]:mt-10 [&>h2]:mb-5 [&>h2:not(:first-child)]:mt-8 [&>h3]:mb-4 [&>h3:not(:first-child)]:mt-6 [&>p]:mb-5 [&>ul]:mb-5 [&>ol]:mb-5 [&>li]:mb-3 [&>ol]:pl-8 [&>ul]:pl-8 [&>strong]:font-bold">
          <ReactMarkdown>{displaySummary}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}


