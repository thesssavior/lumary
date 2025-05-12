import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import enMessages from '@/messages/en.json';
import koMessages from '@/messages/ko.json';
import { calculateTokenCount } from '@/lib/utils';

// ────────────────────────────────────────────────────────────────
// constants & helpers
const MAX_CHUNK_INPUT_TOKENS = 16384;
const model = 'gpt-4.1-mini';
const FINAL_SEPARATOR = ' <<<OVERVIEW_START>>>';

function chunkTranscript(
  transcriptText: string,
  totalTokens: number,
  maxTokens: number = MAX_CHUNK_INPUT_TOKENS
): string[] {
  const numChunks = Math.ceil(totalTokens / maxTokens);
  const approxCharPerChunk = Math.ceil(transcriptText.length / numChunks);
  const chunks: string[] = [];

  for (let i = 0; i < numChunks; i++) {
    const start = i === 0 ? 0 : i * approxCharPerChunk;
    const end   = i === numChunks - 1 ? transcriptText.length
                                      : (i + 1) * approxCharPerChunk;
    chunks.push(transcriptText.slice(start, end));
  }
  return chunks;
}

// ────────────────────────────────────────────────────────────────
// route handler
export async function POST(req: Request) {
  try {
    const {
      videoId,
      locale = 'ko',
      transcriptText,
      title,
      videoDescription,
      tokenCount,
    } = await req.json();

    if (!videoId || !transcriptText) {
      const messages = locale === 'ko' ? koMessages : enMessages;
      return NextResponse.json({ error: messages.error }, { status: 400 });
    }

    const messages   = locale === 'ko' ? koMessages : enMessages;
    const videoTitle = title || '';

    // ── 1. split transcript ────────────────────────────────────
    const transcriptChunks = chunkTranscript(transcriptText, tokenCount);

    // ── 2. warm‑up concurrency: fire all requests now ───────────
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const encode = (s: string) => new TextEncoder().encode(s);
    const chunkPromises = transcriptChunks.map((chunk, idx) =>
      openai.chat.completions.create({
        model,
        stream: true,
        temperature: 0.3,
        messages: [
          { role: 'system', content: messages.systemPromptsChunked },
          {
            role: 'user',
            content: `${messages.userPromptsChunked}
              respond in language: ${locale}
              Video Title: ${videoTitle}
              Video Description: ${videoDescription}
              Transcript:
              ${chunk}`,
          },
        ],
      })
    );

    // ── 3. create streaming response ────────────────────────────
    const stream = new ReadableStream({
      async start(controller) {
        const collectedSummaries: string[] = [];

        // sequentially stream each *already‑running* request
        for (let i = 0; i < chunkPromises.length; i++) {
          const completion = await chunkPromises[i]; // resolves fast now
          let currentSummary = '';

          for await (const part of completion) {
            const content = part.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encode(content));
              currentSummary += content;
            }
          }

          collectedSummaries.push(currentSummary);

          if (i < chunkPromises.length - 1) {
            controller.enqueue(encode('\n\n---\n\n')); // separator
          }
        }

        // ── 4. final intro / TOC / outro pass ───────────────────
        const concatenated = collectedSummaries.join('\n\n');
        const finalCompletion = await openai.chat.completions.create({
          model,
          stream: true,
          temperature: 0.3,
          messages: [
            { role: 'system', content: messages.systemPromptsFinal },
            {
              role: 'user',
              content: `${messages.userPromptsFinal}
                respond in language: ${locale}
                Collected Summaries:
                ${concatenated}`,
            },
          ],
        });
        controller.enqueue(encode(FINAL_SEPARATOR)); // separator
        for await (const part of finalCompletion) {
          const content = part.choices[0]?.delta?.content;
          if (content) controller.enqueue(encode(content));
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        // “chunked” is implicit, but harmless to keep
        'Transfer-Encoding': 'chunked',
        'input_token_count': `${tokenCount}`,
      },
    });
  } catch (err: any) {
    console.error('summarise‑route error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
