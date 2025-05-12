"use client";

import { useTranslations } from 'next-intl';
import { Card } from "@/components/ui/card";
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

export function FullTranscriptViewer({ transcript }: { transcript: string }) {
  const t = useTranslations();

  if (!transcript) {
    return (
      <Alert className="mt-6 bg-blue-50 border-blue-200 text-blue-700">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{t('noTranscriptAvailableOrNotProcessed')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div> 
      <h3 className="text-lg font-medium mb-4 text-zinc-700">{t('fullTranscriptTitle')}</h3>
      <div className="text-sm whitespace-pre-line text-gray-700 max-h-96 overflow-y-auto" style={{ lineHeight: '1.6' }}>
        {transcript}
      </div>
    </div>
  );
} 