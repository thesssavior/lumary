import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import enMessages from '@/messages/en.json';
import koMessages from '@/messages/ko.json';
import { YoutubeTranscript } from 'youtube-transcript';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { formatTime } from '@/lib/utils';
import { Tiktoken } from "tiktoken/lite";
import cl100k_base from "tiktoken/encoders/cl100k_base.json";

// --- Constants --- (Moved to top for clarity)
const PROXY_URL = process.env.BRIGHTDATA_PROXY_URL; // Use env variable for proxy
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL_NAME = "gpt-4.1-mini";
const MAX_TOKENS = 4096; // Max output tokens for the summary
const MAX_TOKENS_SUMMARY = 2048; // Max output tokens for each chunk
const TEMPERATURE = 0.3;
const MAX_CHUNK_INPUT_TOKENS = 16384; // Keep input reasonable per chunk
const FINAL_SYNTHESIS_MARKER = ":::FINAL_SYNTHESIS_START:::"; // Marker for the client
// -----------------

// Initialize OpenAI client once
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Initialize Proxy Agent once
const agent = PROXY_URL ? new HttpsProxyAgent(PROXY_URL) : undefined;

// Initialize Tokenizer once
const encoding = new Tiktoken(
  cl100k_base.bpe_ranks,
  cl100k_base.special_tokens,
  cl100k_base.pat_str
);

// --- Helper Functions ---

/**
 * Calculates the number of tokens in a given text.
 */
function calculateTokens(text: string): number {
  // Add slight buffer for safety, models don't always match tokenizer 100%
  return encoding.encode(text).length + 10; 
}

/**
 * Fetches transcript using youtube-transcript library, adding timestamps to every line.
 */
async function fetchTranscript(videoId: string): Promise<string> {
  const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
    fetchOptions: agent ? { agent } : undefined,
  } as any);
  // Add timestamp for every item
  return transcript.map((item) => `[${formatTime(item.offset)}] ${item.text}`)
    .join('\n');
}

/**
 * Splits transcript into N chunks based on total token count: calculates total tokens, divides by maxTokens to get number of chunks,
 * then slices the transcript into roughly equal character-based chunks, logging details.
 */
function chunkTranscript(transcriptText: string, locale: string, maxTokens: number = MAX_CHUNK_INPUT_TOKENS): string[] {
  // Calculate total tokens and determine number of chunks
  const totalTokens = calculateTokens(transcriptText);
  const numChunks = Math.ceil(totalTokens / maxTokens);

  // Determine approximate character size per chunk
  const approxCharPerChunk = Math.ceil(transcriptText.length / numChunks);
  const chunks: string[] = [];
  for (let i = 0; i < numChunks; i++) {
    const start = i * approxCharPerChunk;
    const end = i === numChunks - 1 ? transcriptText.length : start + approxCharPerChunk;
    const chunk = transcriptText.slice(start, end);
    chunks.push(chunk);
  }
  return chunks;
}
// ------------------------

export async function POST(req: Request) {
  const { videoId, locale = 'ko' } = await req.json();
  const messages = locale === 'ko' ? koMessages : enMessages;

  if (!videoId) return NextResponse.json({ error: messages.error }, { status: 400 });
  if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set.");
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  try {
    // 1. Fetch Transcript
    let transcriptText = '';
    try {
      transcriptText = await fetchTranscript(videoId);
    } catch (error: any) {
      console.error(`Error fetching transcript for videoId ${videoId}:`, error.message);
      return NextResponse.json({ error: messages.error }, { status: 400 });
    }
    if (!transcriptText) {
      console.warn(`Empty transcript received for videoId: ${videoId}`);
      return NextResponse.json({ error: messages.error }, { status: 400 });
    }

    // 2. Calculate Tokens and Decide on Chunking
    const totalTokens = calculateTokens(transcriptText);
    const isMultiChunk = totalTokens > MAX_CHUNK_INPUT_TOKENS;

    const transcriptChunks = isMultiChunk
      ? chunkTranscript(transcriptText, locale, MAX_CHUNK_INPUT_TOKENS)
      : [transcriptText];

    // 3. Prepare for API Call(s) & Stream
    const encoder = new TextEncoder();
    let chunkCounter = 0;
    const chunkSummaries: string[] = []; // Store chunk summaries for final synthesis

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // --- Stream Chunk Summaries ---
          for (const chunk of transcriptChunks) {
            chunkCounter++;
            const systemPromptText = isMultiChunk 
              ? messages.systemPromptsChunked
              : messages.systemPrompts;

            const userPromptText = isMultiChunk
              ? `${messages.userPromptsChunked} [Part ${chunkCounter}/${transcriptChunks.length}]\n\n${chunk}`
              : `${messages.userPrompts}\n\n${chunk}`;

            let currentChunkSummary = '';
            const completion = await openai.chat.completions.create({
                model: MODEL_NAME,
                messages: [
                    // System prompt might need adjustment for chunks if default one performs poorly
                    { role: "system", content: systemPromptText },
                    { role: "user", content: userPromptText }
                ],
                stream: true,
                max_tokens: MAX_TOKENS_SUMMARY, // Max output for *this* chunk
                temperature: TEMPERATURE,
             });

            for await (const part of completion) {
              const content = part.choices[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(content));
                if (isMultiChunk) {
                    currentChunkSummary += content;
                }
              }
            }
            if (isMultiChunk) {
                 chunkSummaries.push(currentChunkSummary);
            }
          } // End of chunk loop

          // --- Perform Smoothing Synthesis (if multi-chunk) ---
          if (isMultiChunk) {
            const concatenatedSummaries = chunkSummaries.join("\n\n---\n\n");
            const finalPromptText = `${messages.userPromptFinalSynthesis}\n\n${concatenatedSummaries}`;

            // Signal the client that smoothing synthesis is starting
            controller.enqueue(encoder.encode(FINAL_SYNTHESIS_MARKER));

            const finalCompletion = await openai.chat.completions.create({
                model: MODEL_NAME,
                messages: [
                    { role: "system", content: messages.systemPrompts },
                    { role: "user", content: finalPromptText }
                ],
                stream: true,
                // no max tokens, full output is allowed
                temperature: TEMPERATURE,
            });

            for await (const part of finalCompletion) {
                const content = part.choices[0]?.delta?.content;
                if (content) {
                    controller.enqueue(encoder.encode(content));
                }
            }
          }

        } catch (error: any) {
            // Log error context (chunk number or synthesis step)
            const stage = isMultiChunk && chunkSummaries.length === transcriptChunks.length ? "final synthesis" : `chunk ${chunkCounter}`;
            console.error(`OpenAI API error during ${stage} for videoId: ${videoId}:`, error.message, error.response?.data); // Log more details if available
            try {
                const errorMsg = `\n[Error during ${stage}: ${messages.error || 'OpenAI API error'}]`;
                controller.enqueue(encoder.encode(errorMsg));
            } catch(e) {
                console.error("Failed to enqueue error message into stream");
            }
             // Ensure the stream is properly signaled as errored
            try { 
                if (!controller.desiredSize) { // Check if controller is still active
                   controller.error(error); 
                }
            } catch(e) { console.error("Failed to signal error on stream", e); }
        } finally {
            // Always close the stream once done
            try {
                controller.close();
            } catch(e) {
                console.error("Failed to close stream", e);
            }
        }
      }
    });

    // Return the stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Input-Tokens': totalTokens.toString(),
      }
    });

  } catch (error: any) {
    console.error("General error in POST handler:", error.message, error.stack);
    let errorMsg = 'An unexpected server error occurred';
     try {
        const currentLocale = req.headers.get('accept-language')?.includes('ko') ? 'ko' : 'en';
        const errorMessages = currentLocale === 'ko' ? koMessages : enMessages;
        errorMsg = errorMessages?.error || errorMsg;
     } catch (_) {} 
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}