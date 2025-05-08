import { NextResponse } from 'next/server';
import {
  fetchTranscriptWithFallback,
  fetchTranscriptFromCloudflare,
  formatTranscript,
  fetchYoutubeInfo
} from '@/lib/youtube-utils';
import enMessages from '@/messages/en.json';
import koMessages from '@/messages/ko.json';
import { calculateTokenCount } from '@/lib/utils';

export async function POST(req: Request) {
  try {
    const { videoId, locale = 'ko' } = await req.json();
    const messages = locale === 'ko' ? koMessages : enMessages;

    if (!videoId) {
      return NextResponse.json({ error: messages.error }, { status: 400 });
    }

    let title = '';
    let description = '';
    let rawTranscript: any[] = [];
    let formattedTranscriptText = '';
    let fetcherUsed = 'unknown';

    try {
      rawTranscript = await fetchTranscriptWithFallback(videoId);
      formattedTranscriptText = formatTranscript(rawTranscript, 'offset');
      fetcherUsed = "residential";
    } catch (primaryError: any) {
      console.warn(
        `Primary transcript fetch for ${videoId} failed: ${primaryError.message}. Trying fallback.`
      );
      try {
        rawTranscript = await fetchTranscriptFromCloudflare(videoId);
        formattedTranscriptText = formatTranscript(rawTranscript, 'start');
        fetcherUsed = "cloudflare";
      } catch (fallbackError: any) {
        console.error(
          `Fallback transcript fetch for ${videoId} also failed: ${fallbackError.message}`
        );
        if (fallbackError.message.includes('Transcript is disabled') || (primaryError.message && primaryError.message.includes('Transcript is disabled'))) {
          return NextResponse.json({ error: messages.transcriptDisabled }, { status: 400 });
        }
        return NextResponse.json({ error: messages.error || 'Failed to fetch transcript after multiple attempts' }, { status: 500 });
      }
    }
    
    try {
        const videoInfo = await fetchYoutubeInfo(videoId);
        if (videoInfo) {
          title = videoInfo.title;
          description = videoInfo.description;
        }
    } catch (e: any) {
    console.warn(`Failed to fetch video info for ${videoId}: ${e.message}. Proceeding without it.`);
    }
  
  
    if (!rawTranscript || rawTranscript.length === 0) {
      console.warn(`Transcript for ${videoId} resulted in empty items, possibly disabled.`);
      return NextResponse.json({ error: messages.transcriptDisabled }, { status: 400 });
    }

    const tokenCount = calculateTokenCount(formattedTranscriptText);

    return NextResponse.json({ 
      transcript: formattedTranscriptText, 
      title: title, 
      description: description,
      tokenCount: tokenCount,
      videoId: videoId,
      locale: locale
    }, { status: 200 });

  } catch (error: any) {
    console.error("[API /transcript] General error:", error.message);
    const messagesForError = error.locale === 'ko' ? koMessages : enMessages; 
    return NextResponse.json({ error: messagesForError.error || 'An unexpected error occurred.' }, { status: 500 });
  }
} 


function setTranscriptData(arg0: { transcript: string; title: string; description: string; }) {
    throw new Error('Function not implemented.');
}

