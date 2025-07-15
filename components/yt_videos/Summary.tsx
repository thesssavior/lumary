import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Check, Copy, Loader2, AlertTriangle, FileText } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface SummaryProps {
  summary: string
  summaryId?: string
  contentLanguage?: string
  chapters?: any[]
  title?: string
  videoDescription?: string
  onSummaryGenerated?: (summary: string) => void
  onSummarySaved?: (summaryData: any) => void
}

const Summary = ({ 
  summary, 
  summaryId, 
  contentLanguage, 
  chapters,
  title,
  videoDescription,
  onSummaryGenerated,
  onSummarySaved
}: SummaryProps) => {
  const t = useTranslations('')
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedSummary, setGeneratedSummary] = useState('')
  const [isGenerated, setIsGenerated] = useState(false)

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

  const copyToClipboard = () => {
    const textToCopy = generatedSummary || summary
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
    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
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

  const hasContent = chapters && Array.isArray(chapters) && chapters.length > 0
  const displaySummary = generatedSummary || summary

  // Loading state
  if (isGenerating || isSaving) {
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
        {generatedSummary && (
          <div className="w-full mt-6 p-4 border rounded-lg bg-gray-50 max-w-2xl">
            <div className="text-black text-sm max-h-40 overflow-y-auto">
              <ReactMarkdown>{generatedSummary}</ReactMarkdown>
            </div>
          </div>
        )}
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
    <div className="prose prose-zinc max-w-none p-4 pr-16 rounded-lg relative">
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
      
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm mb-4">
          <p><span className="font-semibold">Error encountered:</span> {error}</p>
        </div>
      )}
      
      <div className="text-black [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg [&>p]:text-base [&>ul]:list-disc [&>ol]:list-decimal [&>li]:ml-4 [&>h1]:mb-6 [&>h1:not(:first-child)]:mt-10 [&>h2]:mb-5 [&>h2:not(:first-child)]:mt-8 [&>h3]:mb-4 [&>h3:not(:first-child)]:mt-6 [&>p]:mb-5 [&>ul]:mb-5 [&>ol]:mb-5 [&>li]:mb-3 [&>ol]:pl-8 [&>ul]:pl-8 [&>strong]:font-bold [&>strong]:text-black">
        <ReactMarkdown>{displaySummary}</ReactMarkdown>
      </div>
    </div>
  )
}

export default Summary