import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import enMessages from '@/messages/en.json';
import koMessages from '@/messages/ko.json';

// Constants
const model = 'gpt-4.1-mini';

// POST request to summarize a video
export async function POST(req: Request) {
  try {
    console.log("summarize route called");
    // Get videoId, locale, transcriptText, title, and videoDescription from request
    const { 
      videoId, 
      locale = 'ko', 
      transcriptText, 
      title, 
      videoDescription,
      tokenCount
    } = await req.json();
    
    const messages = locale === 'ko' ? koMessages : enMessages;
    const videoTitle = title || ''; 

    if (!videoId || !transcriptText) { 
      return NextResponse.json({ error: messages.error }, { status: 400 });
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
          for await (const part of completion) {
            const content = part.choices[0]?.delta?.content;
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
