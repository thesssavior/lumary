import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Check, Copy, Loader2, AlertTriangle, FileText } from 'lucide-react'
import { useTranslations } from 'next-intl'

type SummarySplitProps = {
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
}

export default function SummarySplit({
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
}: SummarySplitProps) {
  const t = useTranslations('')
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedSummary, setGeneratedSummary] = useState('')
  const [isGenerated, setIsGenerated] = useState(false)
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

  const copyToClipboard = () => {
    const textToCopy = generatedSummary || summary
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveSummaryContent = async (summaryContent: string) => {
    if (!summaryId) throw new Error('Summary ID is required')
    const response = await fetch('/api/summaries/summarize2', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summaryId, summary: summaryContent }),
    })
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to save summary content')
    }
    return await response.json()
  }

  const generateFromChapters = async () => {
    if (!chapters || !Array.isArray(chapters) || chapters.length === 0 || !transcript) {
      setError('Chapters are required to generate summary')
      return
    }
    setIsGenerating(true)
    setError(null)
    try {
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

      if (!summaryResponse.ok) throw new Error('Failed to generate summary')

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

      if (onSummaryGenerated && accumulatedSummary) onSummaryGenerated(accumulatedSummary)
      setIsGenerated(true)

      if (accumulatedSummary && summaryId && summaryId !== 'new') {
        setIsSaving(true)
        await saveSummaryContent(accumulatedSummary)
        setIsSaving(false)
      }
    } catch (err: any) {
      console.error('Error generating summary (split):', err)
      setError(err.message || 'Failed to generate summary')
    } finally {
      setIsGenerating(false)
      setIsSaving(false)
    }
  }

  if (error && !isGenerated) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-6 rounded-md bg-red-50 text-red-700">
        <AlertTriangle className="h-10 w-10 mb-3" />
        <p className="font-semibold">{t('Summary.errorTitle')}</p>
        <p className="text-sm mb-4 text-center">{error}</p>
        <Button onClick={generateFromChapters} variant="outline" disabled={isGenerating}>
          Try Again
        </Button>
      </div>
    )
  }

  if (!(generatedSummary || summary) && !isGenerating && !isSaving) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-10 text-center rounded-md mt-[-20%]">
        <FileText className="h-12 w-12 mb-6" />
        <h3 className="text-xl font-semibold mb-2">{t('Summary.generateTitle')}</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-md">{t('Summary.generateDescription')}</p>
        <Button onClick={generateFromChapters} size="lg" disabled={isGenerating}>
          {t('Summary.generateButton')}
        </Button>
      </div>
    )
  }

  return (
    <div className="prose prose-zinc max-w-none p-4 pr-16 rounded-lg relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={copyToClipboard}
        className="absolute top-4 right-4 h-8 w-8 p-0 hover:bg-gray-100"
        title={copied ? t('copiedToClipboard') : t('copySummary')}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <div className="text-black [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg [&>p]:text-base [&>ul]:list-disc [&>ol]:list-decimal [&>li]:ml-4 [&>h1]:mb-6 [&>h1:not(:first-child)]:mt-10 [&>h2]:mb-5 [&>h2:not(:first-child)]:mt-8 [&>h3]:mb-4 [&>h3:not(:first-child)]:mt-6 [&>p]:mb-5 [&>ul]:mb-5 [&>ol]:mb-5 [&>li]:mb-3 [&>ol]:pl-8 [&>ul]:pl-8 [&>strong]:font-bold [&>strong]:text-black">
        <ReactMarkdown>{generatedSummary || summary}</ReactMarkdown>
      </div>
    </div>
  )
}


