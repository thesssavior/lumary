import { NextResponse } from 'next/server';
import {
  fetchTranscriptWithFallback,
  fetchTranscriptFromCloudflare,
  formatTranscript,
  fetchYoutubeInfo
} from '@/lib/youtube-utils';
import { supabase } from '@/lib/supabaseClient';
import enMessages from '@/messages/en.json';
import koMessages from '@/messages/ko.json';

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
      const videoInfo = await fetchYoutubeInfo(videoId);
      if (videoInfo) {
        title = videoInfo.title;
        description = videoInfo.description;
      }
    } catch (e: any) {
      console.warn(`Failed to fetch video info for ${videoId}: ${e.message}. Proceeding without it.`);
    }

    try {
      console.log(`Fetching transcript for ${videoId} via standard method.`);
      rawTranscript = await fetchTranscriptWithFallback(videoId);
      formattedTranscriptText = formatTranscript(rawTranscript, 'offset');
      fetcherUsed = "residential";
      console.log(`Transcript for ${videoId} fetched successfully via standard method.`);
    } catch (primaryError: any) {
      console.warn(
        `Primary transcript fetch for ${videoId} failed: ${primaryError.message}. Trying fallback.`
      );
      try {
        rawTranscript = await fetchTranscriptFromCloudflare(videoId);
        formattedTranscriptText = formatTranscript(rawTranscript, 'start');
        fetcherUsed = "cloudflare";
        console.log(`Transcript for ${videoId} fetched successfully via Cloudflare fallback.`);
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

    if (!rawTranscript || rawTranscript.length === 0) {
      console.warn(`Transcript for ${videoId} resulted in empty items, possibly disabled.`);
      return NextResponse.json({ error: messages.transcriptDisabled }, { status: 400 });
    }

    try {
      const { data, error: dbError } = await supabase
        .from('youtube_videos')
        .upsert({
          video_id: videoId, 
          title: title,
          description: description,
          raw_transcript: rawTranscript,
        }, { 
          onConflict: 'video_id'
        })
        .select();

      if (dbError) {
        console.error('Supabase DB Error:', dbError);
      } else {
        console.log('Transcript and metadata saved to Supabase for videoId:', videoId, data);
      }
    } catch (e: any) {
      console.error('Supabase operation failed:', e.message);
    }
    
    return NextResponse.json({ 
      transcript: formattedTranscriptText, 
      title: title, 
      description: description 
    }, { status: 200 });

  } catch (error: any) {
    console.error("[API /transcript] General error:", error.message);
    const messagesForError = error.locale === 'ko' ? koMessages : enMessages; 
    return NextResponse.json({ error: messagesForError.error || 'An unexpected error occurred.' }, { status: 500 });
  }
} 