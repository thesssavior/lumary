import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import enMessages from '@/messages/en.json';
import koMessages from '@/messages/ko.json';
import { YoutubeTranscript } from 'youtube-transcript';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { formatTime, calculateTokenCount } from '@/lib/utils';
import { auth } from '@/auth';

// Webshare proxy setup
const proxyUrl = 'http://toehivex-rotate:esiwn5hn17xs@p.webshare.io:80/';
const agent = new HttpsProxyAgent(proxyUrl);

// Fetch YouTube video title and description using YouTube Data API v3
async function fetchYoutubeInfo(videoId: string): Promise<{ title: string; description: string } | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('YOUTUBE_API_KEY is not set');
    return null;
  }
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error('YouTube API response not ok:', res.status, await res.text());
    return null;
  }
  const data = await res.json();
  if (!data.items || !data.items[0]) {
    console.error('YouTube API returned no items:', JSON.stringify(data));
    return null;
  }
  const snippet = data.items[0].snippet;
  return {
    title: snippet.title || '',
    description: snippet.description || ''
  };
}

export async function POST(req: Request) {
  try {
    // Get videoId and locale from request
    const { videoId, locale = 'ko' } = await req.json();
    const messages = locale === 'ko' ? koMessages : enMessages;

    // Check session
    const session = await auth();
    const isSignedIn = !!session?.user;

    if (!videoId) {
      return NextResponse.json({ error: messages.error }, { status: 400 });
    }

    // Fetch video info (title, description)
    let videoTitle = '';
    let videoDescription = '';
    try {
      const videoInfo = await fetchYoutubeInfo(videoId);
      if (videoInfo) {
        videoTitle = videoInfo.title;
        videoDescription = videoInfo.description;
      }
    } catch (e) {
      console.error('Failed to fetch video info:', e);
    }

    // Fetch transcript
    let transcriptText = '';
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        fetchOptions: { agent },
      } as any);

      transcriptText = transcript.map((item, idx) =>
        idx % 4 === 0
          ? `[${formatTime(item.offset)}] ${item.text}`
          : item.text
      ).join('\n');
    } catch (error: any) {
      console.error('Error fetching transcript:', error);
      if (typeof error.message === 'string' && error.message.includes('Transcript is disabled')) {
        return NextResponse.json({ error: messages.transcriptDisabled }, { status: 400 });
      }
      return NextResponse.json({ error: messages.error }, { status: 400 });
    }

    if (!transcriptText) {
      return NextResponse.json({ error: messages.error }, { status: 400 });
    }

    const tokenCount = calculateTokenCount(transcriptText);

    // Model and token limit logic
    let model = 'gpt-4.1-mini';
    let tokenLimit = 16384;
    if (isSignedIn && session?.user?.plan && session.user.plan !== 'free') {
      // Paid user
      if (tokenCount > 65536) {
        return NextResponse.json({ error: messages.inputTooLong }, { status: 400 });
      }
      if (tokenCount > 24000) {
        model = 'gpt-4.1';
        tokenLimit = 65536;
      } else {
        model = 'gpt-4.1-mini';
        tokenLimit = 65536;
      }
    } else {
      // Unpaid/guest: always use mini, always 32768 limit
      if (tokenCount > 32768) {
        return NextResponse.json({ error: messages.guestTokenLimit || messages.inputTooLong }, { status: 400 });
      }
      model = 'gpt-4.1-mini';
      tokenLimit = 32768;
    }
        
    // Summarize with OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const encoder = new TextEncoder();
  
    const stream = new ReadableStream({
      async start(controller) {
        const completion = await openai.chat.completions.create({
          model: model,
          messages: [
            { role: "system", content: messages.systemPrompts },
            { role: "user", content: `${messages.userPrompts}\n\nVideo Title: ${videoTitle}\n\nVideo Description: ${videoDescription}\n\nTranscript:\n${transcriptText}` }
          ],
          stream: true,
          temperature: 0.3,
        });
  
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'input_token_count': `${tokenCount}`,
      }
    });
  } catch (error: any) {
    console.error("General error:", error.message);
    return NextResponse.json({ error: `${error.message}` }, { status: 500 });
  }
}
