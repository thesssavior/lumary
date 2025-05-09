import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import enMessages from '@/messages/en.json';
import koMessages from '@/messages/ko.json';
import { formatTime, calculateTokenCount } from '@/lib/utils';
import { auth } from '@/auth';
import { YoutubeTranscript } from 'youtube-transcript';
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxyUrls = [
  'http://toehivex-rotate:esiwn5hn17xs@p.webshare.io:80/',
  'http://pUUJm81Z0iLPUl2t:G8MtlvbQ73fGcsxh@geo.iproyal.com:12321',
  'http://brd-customer-hl_414d8129-zone-residential_proxy1:yd55dtlsq03w@brd.superproxy.io:33335',
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
    }
  }
  throw lastError;
}

// New helper to fetch transcript from cloudflare endpoint
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
    throw new Error('Failed to fetch transcript from cloudflare endpoint');
  }
  const data = await res.json();
  if (!data.transcript || !Array.isArray(data.transcript)) {
    throw new Error('Transcript not found in cloudflare response');
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

    let currentFetcher = "primary"; // Initialize fetcher for this request

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

    // Fetch transcript: try original, fallback to cloudflare
    let transcriptText = '';
    let identifiedAsDisabled = false; // Flag to track if "Transcript is disabled" was encountered

    try { // This try covers the entire transcript fetching process
      let transcriptRawData;
      try {
        // Attempt 1: Proxies
        transcriptRawData = await fetchTranscriptWithFallback(videoId);
        transcriptText = transcriptRawData.map((item: any, idx: number) =>
          idx % 4 === 0
            ? formatTime(item.offset) // Assuming formatTime is available and returns string
            ? `[${formatTime(item.offset)}] ${item.text}`
            : item.text // Fallback if formatTime returns falsy
            : item.text
        ).join('\n');
      } catch (primaryError: any) {
        console.warn('Primary transcript fetch failed (proxies), trying cloudflare fallback. Reason:', primaryError.message);
        if (typeof primaryError.message === 'string' && primaryError.message.includes('Transcript is disabled')) {
          identifiedAsDisabled = true;
        }
        // Attempt 2: Cloudflare
        currentFetcher = "cloudflare";
        transcriptRawData = await fetchTranscriptFromCloudflare(videoId);
        // Ensure transcriptRawData is an array before mapping
        if (Array.isArray(transcriptRawData)) {
            transcriptText = transcriptRawData.map((item: any, idx: number) =>
              idx % 4 === 0
                ? formatTime(item.start) // Assuming formatTime is available and returns string
                ? `[${formatTime(item.start)}] ${item.text}`
                : item.text // Fallback if formatTime returns falsy
                : item.text
            ).join('\n');
        } else {
            // If Cloudflare returns non-array (e.g. error object or empty response not caught as error)
            transcriptText = ""; // Ensure transcriptText is empty
            console.warn("Cloudflare fallback did not return a valid transcript array.");
        }


        if (transcriptText) { // If Cloudflare succeeded in getting non-empty text
          identifiedAsDisabled = false; // Clear the flag, as we found a transcript
        }
        // If Cloudflare failed and threw an error, this inner catch block's error is propagated to the outer catch.
        // If Cloudflare succeeded but transcriptText is empty, identifiedAsDisabled (if true from primary) remains true.
      }
    } catch (errorAfterAllAttempts: any) {
      // This block is hit if:
      // 1. fetchTranscriptWithFallback failed AND fetchTranscriptFromCloudflare also failed (error is from CF).
      // Note: The original code structure implies that if fetchTranscriptWithFallback fails, its error is caught,
      // and then fetchTranscriptFromCloudflare is attempted. If *that* fails, its error is caught here.
      console.error('All transcript fetch attempts failed. Last error:', errorAfterAllAttempts.message);
      if (identifiedAsDisabled) { // If primary attempt (proxies) already flagged it as disabled
        return NextResponse.json({ error: messages.transcriptDisabled }, { status: 400 });
      }
      // If not flagged by primary, check if the last error itself mentions disabled
      if (typeof errorAfterAllAttempts.message === 'string' && errorAfterAllAttempts.message.includes('Transcript is disabled')) {
        return NextResponse.json({ error: messages.transcriptDisabled }, { status: 400 });
      }
      // Otherwise, a generic failure from transcript fetching
      return NextResponse.json({ error: messages.error }, { status: 400 });
    }

    if (!transcriptText) {
      if (identifiedAsDisabled) { // If attempts were made, no error was thrown by the final step, but text is empty and was flagged as disabled
        return NextResponse.json({ error: messages.transcriptDisabled }, { status: 400 });
      }
      // Transcript is empty for other reasons
      console.error('Error fetching transcript: Resulting transcriptText is empty and not flagged as disabled.');
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
        'fetcher': `${currentFetcher}`,
        'video_title': encodeURIComponent(`${videoTitle}`),
      }
    });
  } catch (error: any) {
    console.error("General error:", error.message);
    return NextResponse.json({ error: `${error.message}` }, { status: 500 });
  }
}
