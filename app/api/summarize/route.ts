import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import enMessages from '@/messages/en.json';
import koMessages from '@/messages/ko.json';
import { YoutubeTranscript } from 'youtube-transcript';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { formatTime } from '@/lib/utils';
import { Tiktoken } from 'tiktoken/lite';
import o200k_base from 'tiktoken/encoders/o200k_base.json';

const encoding = new Tiktoken(
  o200k_base.bpe_ranks,
  o200k_base.special_tokens,
  o200k_base.pat_str
);
const tokens = encoding.encode("hello world");
encoding.free();


let model = "gpt-4.1-mini";

// Bright Data proxy setup
const proxyUrl = 'http://brd-customer-hl_414d8129-zone-residential_proxy1:yd55dtlsq03w@brd.superproxy.io:33335';
const agent = new HttpsProxyAgent(proxyUrl);

// Function to calculate token count for a given text
function calculateTokenCount(text: string): number {
  const encoding = new Tiktoken(
    o200k_base.bpe_ranks,
    o200k_base.special_tokens,
    o200k_base.pat_str
  );
  const tokens = encoding.encode(text);
  const tokenCount = tokens.length;
  encoding.free();
  return tokenCount;
}

// Fetch YouTube video title using YouTube Data API v3
async function fetchYoutubeTitle(videoId: string): Promise<string | null> {
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
  return data.items[0].snippet.title ?? null;
}

export async function POST(req: Request) {
  try {
    // Get videoId and locale from request
    const { videoId, locale = 'ko' } = await req.json();
    const messages = locale === 'ko' ? koMessages : enMessages;

    if (!videoId) {
      return NextResponse.json({ error: messages.error }, { status: 400 });
    }

    // Fetch transcript
    let transcriptText = '';
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        fetchOptions: { agent },
      } as any);

      transcriptText = transcript.map(item =>
        `[${formatTime(item.offset)}] ${item.text}`
      ).join('\n');
    } catch (error) {
      console.error('Error fetching transcript:', error);
      return NextResponse.json({ error: messages.error }, { status: 400 });
    }

    if (!transcriptText) {
      return NextResponse.json({ error: messages.error }, { status: 400 });
    }

    const tokenCount = calculateTokenCount(transcriptText);
    console.log(`Token count: ${tokenCount}`);

    if (tokenCount > 16384) {
      model = "gpt-4.1";
      console.log("Token count is greater than 16384, using gpt-4.1");
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
            { role: "user", content: `${messages.userPrompts}\n\n${transcriptText}` }
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
      }
    });
  } catch (error: any) {
    console.error("General error:", error.message);
    return NextResponse.json({ error: `${error.message}` }, { status: 500 });
  }
}
