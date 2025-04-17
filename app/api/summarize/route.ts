import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import enMessages from '@/messages/en.json';
import koMessages from '@/messages/ko.json';
import { YoutubeTranscript } from 'youtube-transcript';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { formatTime } from '@/lib/utils';

// Bright Data proxy setup
const proxyUrl = 'http://brd-customer-hl_414d8129-zone-residential_proxy1:yd55dtlsq03w@brd.superproxy.io:33335';
const agent = new HttpsProxyAgent(proxyUrl);

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

    // Summarize with OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const encoder = new TextEncoder();
  
    const stream = new ReadableStream({
      async start(controller) {
        const completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: messages.systemPrompts },
            { role: "user", content: `${messages.userPrompts}\n\n${transcriptText}` }
          ],
          stream: true,
          max_tokens: 3000,
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
