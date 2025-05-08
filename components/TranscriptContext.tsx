// TranscriptContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface TranscriptData {
  transcript: string;
  title: string;
  description: string;
}

interface TranscriptContextType {
  transcriptData: TranscriptData | null;
  setTranscriptData: (data: TranscriptData) => void;
}

const TranscriptContext = createContext<TranscriptContextType | undefined>(undefined);

export const TranscriptProvider = ({ children }: { children: ReactNode }) => {
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);

  return (
    <TranscriptContext.Provider value={{ transcriptData, setTranscriptData }}>
      {children}
    </TranscriptContext.Provider>
  );
};

export const useTranscript = () => {
  const context = useContext(TranscriptContext);
  if (!context) {
    throw new Error('useTranscript must be used within a TranscriptProvider');
  }
  return context;
};