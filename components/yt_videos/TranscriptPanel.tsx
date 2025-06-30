'use client';

import { FullTranscriptViewer } from './FullTranscriptViewer';
import { useTranslations } from 'next-intl';

interface TranscriptPanelProps {
  transcript: string | null;
}

export function TranscriptPanel({ transcript }: TranscriptPanelProps) {
  const t = useTranslations();

  return (
    <div className="h-full bg-white border overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="px-3 py-2 border-b bg-gray-50 flex-shrink-0">
          <h3 className="font-semibold text-gray-800 text-sm">{t('transcriptTab')}</h3>
        </div>
        <div className="flex-1 overflow-auto p-3">
          {transcript ? (
            <FullTranscriptViewer transcript={transcript} />
          ) : (
            <p className="text-gray-500 text-sm">No transcript available for this summary.</p>
          )}
        </div>
      </div>
    </div>
  );
} 