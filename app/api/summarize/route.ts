import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import enMessages from '@/messages/en.json';
import koMessages from '@/messages/ko.json';
import { calculateTokenCount } from '@/lib/utils';

// Constants
const MAX_CHUNK_INPUT_TOKENS = 20000; // Maximum tokens per chunk
const model = 'gpt-4.1-mini';
let fetcher = "railway";

// Helper function to split transcript into chunks
function chunkTranscript(transcriptText: string, maxTokens: number = MAX_CHUNK_INPUT_TOKENS, overlap: number = 100): string[] {
  const totalTokens = calculateTokenCount(transcriptText);
  const numChunks = Math.ceil(totalTokens / maxTokens);
  const approxCharPerChunk = Math.ceil(transcriptText.length / numChunks);
  const chunks: string[] = [];
  
  for (let i = 0; i < numChunks; i++) {
    // Calculate start position with overlap (except for first chunk)
    const start = i === 0 ? 0 : i * approxCharPerChunk;
    // const start = i === 0 ? 0 : i * approxCharPerChunk - overlap;
    // Calculate end position with overlap (except for last chunk)
    const end = i === numChunks - 1 
      ? transcriptText.length 
      : (i + 1) * approxCharPerChunk;
    
    const chunk = transcriptText.slice(start, end);
    chunks.push(chunk);
  }
  return chunks;
}

// proxyUrls, fetchTranscriptWithFallback, fetchTranscriptFromCloudflare, formatTranscript
// are now imported from @/lib/youtube-utils

// Fetch YouTube video title and description using YouTube Data API v3

export async function POST(req: Request) {
  try {
    console.log("summarize route called");
    // Get videoId and locale from request
    const { videoId, locale = 'ko' } = await req.json();
    const messages = locale === 'ko' ? koMessages : enMessages;

    if (!videoId) {
      return NextResponse.json({ error: messages.error }, { status: 400 });
    }

    // Build absolute URL for /api/transcript
    const { origin } = new URL(req.url);
    const transcriptUrl = `${origin}/api/transcript`;

    // Fetch transcript, title, and description
    const transcriptApiResponse = await fetch(transcriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, locale })
    });
    const transcriptData = await transcriptApiResponse.json();

    if (!transcriptApiResponse.ok || transcriptData.error) {
      return NextResponse.json({ error: transcriptData.error || messages.error }, { status: transcriptApiResponse.status || 500 });
    }
    
    const transcriptText = transcriptData.transcript;
    const videoTitle = transcriptData.title || ''; // Use title from transcript API
    const videoDescription = transcriptData.description || ''; // Use description from transcript API

    if (!transcriptText) {
      return NextResponse.json({ error: messages.error }, { status: 400 });
    }

    // Calculate total tokens and determine if chunking is needed
    const tokenCount = calculateTokenCount(transcriptText);
    const isMultiChunk = tokenCount > MAX_CHUNK_INPUT_TOKENS;
    const transcriptChunks = isMultiChunk ? chunkTranscript(transcriptText) : [transcriptText];
    let systemPrompt = isMultiChunk ? messages.systemPromptsChunked : messages.systemPrompts;
    let userPrompt = isMultiChunk ? messages.userPromptsChunked : messages.userPrompts;

    // Summarize with OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < transcriptChunks.length; i++) {
          console.log("tokenCount: ", tokenCount, "isMultiChunk: ", isMultiChunk);
          console.log("processing chunk", i, "tokenCount of chunk", calculateTokenCount(transcriptChunks[i]));
          const chunk = transcriptChunks[i];
          const completion = await openai.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `${userPrompt}\n\nVideo Title: ${videoTitle}\n\nVideo Description: ${videoDescription}\n\nTranscript:\n${chunk}` }
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
          // Add a newline between chunks, but not after the last chunk.
          if (i < transcriptChunks.length - 1) {
            controller.enqueue(encoder.encode('\n\n')); 
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
        'fetcher': `${fetcher}`,
      }
    });
  } catch (error: any) {
    console.error("General error:", error.message);
    return NextResponse.json({ error: `${error.message}` }, { status: 500 });
  }
}
