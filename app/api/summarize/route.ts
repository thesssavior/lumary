import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import enMessages from '@/messages/en.json';
import koMessages from '@/messages/ko.json';
import { formatTime, calculateTokenCount } from '@/lib/utils';
import { auth } from '@/auth';
import { YoutubeTranscript } from 'youtube-transcript';
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxyUrls = [
  'http://toehivex:esiwn5hn17xs@p.webshare.io:80/',
  'http://pUUJm81Z0iLPUl2t:G8MtlvbQ73fGcsxh@geo.iproyal.com:12321',
  'http://brd-customer-hl_414d8129-zone-residential_proxy1:yd55dtlsq03w@brd.superproxy.io:33335',
  'http://user-sp1d2iv3s7-country-kr-city-seoul:QY0p3ewONhqn92_kau@gate.decodo.com:10001',
  // 'http://user-sp1d2iv3s7-country-kr-city-seoul:QY0p3ewONhqn92_kau@gate.decodo.com:10002',
  // 'http://user-sp1d2iv3s7-country-kr-city-seoul:QY0p3ewONhqn92_kau@gate.decodo.com:10003',
  // 'http://user-sp1d2iv3s7-country-kr-city-seoul:QY0p3ewONhqn92_kau@gate.decodo.com:10004',
  // 'http://user-sp1d2iv3s7-country-kr-city-seoul:QY0p3ewONhqn92_kau@gate.decodo.com:10005'
];

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

// Helper to try proxies in order
async function fetchTranscriptWithFallback(videoId: string) {
  let lastError;
  for (const proxyUrl of proxyUrls) {
    try {
      const agent = new HttpsProxyAgent(proxyUrl);
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        fetchOptions: { agent } as any
      } as any);
      return transcript;
    } catch (err: any) {
      lastError = err;
      console.error(`Proxy failed: ${proxyUrl}`, err && err.message ? err.message : String(err));
    }
  }
  throw lastError;
}

// New helper to fetch transcript from ngrok endpoint
async function fetchTranscriptFromCloudflare(videoId: string) {
  const endpoint = 'https://pi.lumarly.com/fetch-transcript';
  const SECRET_TOKEN = 'Tmdwn123098';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': SECRET_TOKEN,
    },
    body: JSON.stringify({ video_id: videoId }),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch transcript from ngrok endpoint');
  }
  const data = await res.json();
  if (!data.transcript || !Array.isArray(data.transcript)) {
    throw new Error('Transcript not found in ngrok response');
  }
  return data.transcript;
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

    // Fetch transcript: try original, fallback to ngrok
    let transcriptText = '';
    try {
      let transcript;
      try {
        transcript = await fetchTranscriptWithFallback(videoId);
        transcriptText = transcript.map((item: any, idx: number) =>
          idx % 4 === 0
            ? `[${formatTime(item.offset)}] ${item.text}`
            : item.text
        ).join('\n');
      } catch (primaryError) {
        console.warn('Primary transcript fetch failed, trying cloudflare fallback:', primaryError);
        transcript = await fetchTranscriptFromCloudflare(videoId);
        transcriptText = transcript.map((item: any, idx: number) =>
          idx % 4 === 0
            ? `[${formatTime(item.start)}] ${item.text}`
            : item.text
        ).join('\n');
      }
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
    } else if (isSignedIn) {
      // Unpaid: always use mini, always 32768 limit
      if (tokenCount > 32768) {
        return NextResponse.json({ error: messages.unpaidInputTooLong || messages.inputTooLong }, { status: 400 });
      }
      model = 'gpt-4.1-mini';
      tokenLimit = 32768;
    } else {
      // Unpaid/guest: always use mini, always 32768 limit
      if (tokenCount > 32768) {
        return NextResponse.json({ error: messages.guestTokenLimit || messages.inputTooLong }, { status: 400 });
      }
      model = 'gpt-4.1-mini';
      tokenLimit = 32768;
    }
    console.log('tokenCount', tokenCount);
    console.log('model', model);
    console.log('tokenLimit', tokenLimit);
        
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
