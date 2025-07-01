"use client";

import { useTranslations } from 'next-intl';
// import { Card } from "@/components/ui/card"; // Card is not used
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TranscriptGroup {
  timestamp: string;
  lines: string[];
}

// Function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  if (typeof window !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }
  // Basic fallback for server-side or non-browser environments
  return text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
             .replace(/&quot;/g, '"')
             .replace(/&apos;/g, "'")
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&amp;/g, '&');
}

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

  // Remove the "자막" prefix if it exists
  let processedTranscript = transcript.startsWith("자막\n") ? transcript.substring(3).trim() : transcript.trim();

  // Pre-processing: Ensure every timestamp forces a new line for the split operation.
  // This handles cases where multiple timestamps might exist on a single "line" in the raw data.
  // Updated regex to handle both [HH:MM:SS] and [MM:SS] formats
  const timestampRegex = /(\[[0-9]{2}:[0-9]{2}(?::[0-9]{2})?\])/g;
  processedTranscript = processedTranscript.replace(timestampRegex, '\n$1');

  const groups = processedTranscript
    .split('\n') // Split by newlines (original or newly inserted)
    .map(line => line.trim())
    .filter(line => line) // Remove empty lines that might result from the replace/split
    .reduce<TranscriptGroup[]>((acc, rawLine) => {
      // Updated regex to match both [HH:MM:SS] and [MM:SS] formats
      const match = rawLine.match(/^(\[[0-9]{2}:[0-9]{2}(?::[0-9]{2})?\])/);
      if (match) {
        const timestamp = match[1];
        const textContent = decodeHtmlEntities(rawLine.substring(timestamp.length).trim());
        // Start a new group with this timestamp
        // Add textContent only if it's not empty after decode and trim
        acc.push({ timestamp: timestamp, lines: textContent ? [textContent] : [] });
      } else if (acc.length > 0) {
        // This line is a continuation of the previous group's text
        const textContent = decodeHtmlEntities(rawLine.trim());
        if (textContent) { // Only add non-empty lines
          acc[acc.length - 1].lines.push(textContent);
        }
      } else {
        // Orphaned line before any timestamp (e.g., if "자막" wasn't caught or other header)
        // We'll create a group with no timestamp for it if it has content
        const textContent = decodeHtmlEntities(rawLine.trim());
        if (textContent) {
          // acc.push({ timestamp: '', lines: [textContent] }); // Optionally include orphaned lines
        }
      }
      return acc;
    }, []);

  // Filter out groups that might have a timestamp but ended up with no lines,
  // or groups with no timestamp and no lines (if orphaned line handling was added and resulted in empty lines).
  const finalGroups = groups.filter(g => g.lines.length > 0 || (g.timestamp && g.lines.length === 0) /* Keep timestamp if it was explicitly there, even if its line was empty */);
  
  if (finalGroups.length === 0 && processedTranscript) {
     return (
      <Alert className="mt-6 bg-yellow-50 border-yellow-200 text-yellow-700">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{t('transcriptCouldNotBeParsed')}</AlertDescription>      
      </Alert>
    );
  } else if (finalGroups.length === 0 && !processedTranscript) { 
     return (
      <Alert className="mt-6 bg-blue-50 border-blue-200 text-blue-700">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{t('noTranscriptAvailableOrNotProcessed')}</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="h-full"> 
      {/* <h3 className="text-lg font-medium mb-4 text-zinc-700">{t('fullTranscriptTitle')}</h3> */}
      {/* Removed space-y-3 from here, mb-4 on group div will handle inter-group spacing */}
      <div className="pr-2 h-full">
        {finalGroups.map((group, index) => (
          <div key={index} className="mb-4"> {/* Increased bottom margin for spacing between groups */}
            {group.timestamp && (
              <p className="font-bold text-gray-800 mb-1">{group.timestamp}</p> /* Timestamp as bold paragraph */
            )}
            {/* Indent lines and provide intra-group line spacing */} 
            <div className={"space-y-1"}> 
              {group.lines.map((textLine, lineIndex) => (
                <p key={lineIndex} className="text-sm text-gray-700 leading-relaxed">{textLine}</p> /* Each line of text */
              ))}
              {/* If a timestamped group has no lines (e.g. '[00:01:00]' on its own line), 
                  you might want to render a small placeholder or just let it be empty space under the timestamp. 
                  Currently, it will just show the timestamp and then nothing under it if lines array is empty. */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 