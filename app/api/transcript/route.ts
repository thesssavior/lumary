import { NextResponse } from 'next/server';
import { Supadata, Transcript } from '@supadata/js'
import {
  fetchTranscriptWithFallback,
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
    
    const supadata = new Supadata({
      apiKey: process.env.SUPADATA_API_KEY || '',
    });
    
    let supadataTranscript: Transcript | null = null;
    
    try {
      const transcript = await supadata.youtube.transcript({
        videoId: videoId,
      });
      supadataTranscript = transcript;
      
      // Debug logging to understand Supadata response
      // console.log(`[DEBUG] Supadata response for ${videoId}:`, {
      //   hasContent: !!supadataTranscript?.content,
      //   contentLength: Array.isArray(supadataTranscript?.content) ? supadataTranscript.content.length : 'not array',
      //   contentType: typeof supadataTranscript?.content,
      //   lang: supadataTranscript?.lang,
      //   availableLangs: supadataTranscript?.availableLangs,
      //   firstItem: Array.isArray(supadataTranscript?.content) && supadataTranscript.content.length > 0 ? supadataTranscript.content[0] : 'no first item'
      // });
      
      // Convert Supadata transcript format to standard format
      const standardTranscript = Array.isArray(supadataTranscript.content) ? supadataTranscript.content : [];
      // console.log(`[DEBUG] Standard transcript length for ${videoId}: ${standardTranscript.length}`);
      
      formattedTranscriptText = formatTranscript(standardTranscript, 'offset');
      // console.log(`[DEBUG] Formatted transcript text length for ${videoId}: ${formattedTranscriptText.length}`);
      
      // Check if Supadata returned empty content
      if (standardTranscript.length === 0) {
        console.warn(`[DEBUG] Supadata returned empty content for ${videoId}, falling back to primary method`);
        throw new Error('Supadata returned empty transcript content');
      }
      
      fetcherUsed = "supadata";
    } catch (supadataError: any) {
      console.warn(
        `Supadata transcript fetch for ${videoId} failed: ${supadataError.message}.`
      );
      // try {
      //   // Primary fallback: youtube-transcript with proxies
      //   rawTranscript = await fetchTranscriptWithFallback(videoId);
      //   formattedTranscriptText = formatTranscript(rawTranscript, 'offset');
      //   fetcherUsed = "primary";
      // } catch (primaryError: any) {
      //   console.error(
      //     `All transcript fetch methods for ${videoId} failed. Last error: ${primaryError.message}`
      //   );
      //   return NextResponse.json({ error: messages.error || 'Failed to fetch transcript after multiple attempts' }, { status: 500 });
      // }
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
  
  
    // Check if transcript is empty (considering different fetcher formats)
    const transcriptEmpty = fetcherUsed === "supadata" 
      ? !formattedTranscriptText || formattedTranscriptText.trim().length === 0
      : !rawTranscript || rawTranscript.length === 0;
      
    if (transcriptEmpty) {
      console.warn(`Transcript for ${videoId} resulted in empty items, possibly disabled.`);
      return NextResponse.json({ error: messages.transcriptDisabled }, { status: 400 });
    }

    const tokenCount = calculateTokenCount(formattedTranscriptText);

    return NextResponse.json({ 
      transcript: formattedTranscriptText, 
      title: title, 
      description: description,
      tokenCount: tokenCount,
      fetcher: fetcherUsed
    }, { status: 200 });

  } catch (error: any) {
    console.error("[API /transcript] General error:", error.message);
    const messagesForError = error.locale === 'ko' ? koMessages : enMessages; 
    return NextResponse.json({ error: messagesForError.error || 'An unexpected error occurred.' }, { status: 500 });
  }
}

