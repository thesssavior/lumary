"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

interface TranscriptData {
  videoId: string;
  locale: string;
  transcriptText: string;
  title: string;
  videoDescription?: string;
  tokenCount: number;
  fetcher?: string;
}

interface FolderData {
  id: string;
  name: string;
}

interface InitialGenerationData {
  transcriptData: TranscriptData | null;
  folderForSummary: FolderData | null;
}

interface SummaryGenerationContextType {
  generationData: InitialGenerationData;
  setGenerationData: (data: InitialGenerationData) => void;
}

const SummaryGenerationContext = createContext<SummaryGenerationContextType | undefined>(undefined);

export const SummaryGenerationProvider = ({ children }: { children: ReactNode }) => {
  const [generationData, setGenerationData] = useState<InitialGenerationData>({
    transcriptData: null,
    folderForSummary: null,
  });

  return (
    <SummaryGenerationContext.Provider value={{ generationData, setGenerationData }}>
      {children}
    </SummaryGenerationContext.Provider>
  );
};

export const useSummaryGeneration = () => {
  const context = useContext(SummaryGenerationContext);
  if (context === undefined) {
    throw new Error('useSummaryGeneration must be used within a SummaryGenerationProvider');
  }
  return context;
}; 