"use client";

import { useTranslations } from 'next-intl';
import { Card } from "@/components/ui/card";
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranscript } from '@/components/TranscriptContext';

export function FullTranscriptViewer() {
  const t = useTranslations();
  const { transcriptData } = useTranscript();

  if (!transcriptData) {
    return null;
  }

  const { transcript, title } = transcriptData;

  if (!transcript) {
    return (
      <Alert className="mt-6 bg-blue-50 border-blue-200 text-blue-700">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{t('noTranscriptAvailableOrNotProcessed')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="p-6 bg-white border-zinc-200 mt-6">
      {title && <h2 className="text-xl font-semibold mb-1 text-zinc-800">{title}</h2>}
      <h3 className="text-lg font-medium mb-4 text-zinc-700">{t('fullTranscriptTitle')}</h3>
      <div className="prose prose-zinc max-w-none text-sm whitespace-pre-line text-gray-700 max-h-96 overflow-y-auto" style={{ lineHeight: '1.6' }}>
        {transcript}
      </div>
    </Card>
  );
} 