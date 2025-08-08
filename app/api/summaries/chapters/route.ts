import OpenAI from 'openai';
import { getTranslations } from "next-intl/server";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabaseClient';
import * as fs from 'fs';
import * as path from 'path';

// ────────────────────────────────────────────────────────────────
// constants & helpers
const MAX_CHUNK_INPUT_TOKENS = 16384;
const model = 'gpt-5-mini';

function chunkTranscript(
  transcriptText: string,
  totalTokens: number,
  maxTokens: number = MAX_CHUNK_INPUT_TOKENS
): string[] {
  console.log('=== CHUNKING PROCESS STARTED ===');
  console.log(`Input transcript length: ${transcriptText.length} characters`);
  console.log(`Total tokens: ${totalTokens}`);
  console.log(`Max tokens per chunk: ${maxTokens}`);
  
  const numChunks = Math.ceil(totalTokens / maxTokens);
  console.log(`Number of chunks needed: ${numChunks}`);
  
  const approxCharPerChunk = Math.ceil(transcriptText.length / numChunks);
  console.log(`Approximate characters per chunk: ${approxCharPerChunk}`);
  
  const chunks: string[] = [];

  for (let i = 0; i < numChunks; i++) {
    const start = i === 0 ? 0 : i * approxCharPerChunk;
    const end   = i === numChunks - 1 ? transcriptText.length
                                      : (i + 1) * approxCharPerChunk;
    
    const chunk = transcriptText.slice(start, end);
    chunks.push(chunk);
    
    console.log(`Chunk ${i + 1}:`);
    console.log(`  - Start position: ${start}`);
    console.log(`  - End position: ${end}`);
    console.log(`  - Chunk length: ${chunk.length} characters`);
    console.log(`  - Preview: "${chunk.substring(0, 100)}..."`);
  }
  
  // Write chunks to test.txt for inspection
  try {
    const testFilePath = path.join(process.cwd(), 'test.txt');
    let output = `=== CHUNKING ANALYSIS ===\n`;
    output += `Original transcript length: ${transcriptText.length} characters\n`;
    output += `Total tokens: ${totalTokens}\n`;
    output += `Max tokens per chunk: ${maxTokens}\n`;
    output += `Number of chunks: ${numChunks}\n`;
    output += `Approximate characters per chunk: ${approxCharPerChunk}\n\n`;
    
    chunks.forEach((chunk, index) => {
      output += `=================== CHUNK ${index + 1} ===================\n`;
      output += `Length: ${chunk.length} characters\n`;
      output += `Content:\n${chunk}\n\n`;
    });
    
    fs.writeFileSync(testFilePath, output, 'utf8');
    console.log(`✅ Chunks written to test.txt`);
  } catch (error) {
    console.error('❌ Error writing chunks to test.txt:', error);
  }
  
  console.log('=== CHUNKING PROCESS COMPLETED ===');
  return chunks;
}

export async function POST(request: Request) {
  console.log('=== CHAPTERS PROCESS STARTED ===');
  const { transcript, contentLanguage, tokenCount, videoTitle, videoDescription } = await request.json();
  
  // Use the contentLanguage to get proper locale, fallback to 'ko' if not provided
  const locale = (contentLanguage === 'en') ? 'en' : 'ko';
  const t = await getTranslations({ locale, namespace: 'Chapters' });
  const systemInstruction = t('systemInstruction');
  const userInstruction = t('userInstruction');

  console.log('contentLanguage', contentLanguage);
  console.log('Final system instruction:', `${systemInstruction} respond in ${contentLanguage}`);
  
  if (!transcript) {
    return new Response(
      JSON.stringify({ error: 'Transcript is required' }), 
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const encode = (s: string) => new TextEncoder().encode(s);

    // If we have tokenCount, use chunking logic
    if (tokenCount && tokenCount > MAX_CHUNK_INPUT_TOKENS) {
      const transcriptChunks = chunkTranscript(transcript, tokenCount);
      
      // Warm-up concurrency: fire all requests now
      const chunkPromises = transcriptChunks.map((chunk, idx) =>
        openai.chat.completions.create({
          model,
          stream: true,
          messages: [
            { role: 'system', content: `${systemInstruction} respond in ${contentLanguage}` },
            {
              role: 'user',
              content: `
              ${t('videoTitle')}: ${videoTitle}
              ${t('videoDescription')}: ${videoDescription}

              ${userInstruction}
              ${t('transcript')}: ${chunk}`,
            },
          ],
        })
      );

      // Create streaming response
      const stream = new ReadableStream({
        async start(controller) {
          const collectedChapters: string[] = [];

          // Sequentially stream each already-running request
          for (let i = 0; i < chunkPromises.length; i++) {
            const completion = await chunkPromises[i];
            let currentChapters = '';

            for await (const part of completion) {
              const content = part.choices[0]?.delta?.content;
              if (content) {
                controller.enqueue(encode(content));
                currentChapters += content;
              }
            }

            collectedChapters.push(currentChapters);

            if (i < chunkPromises.length - 1) {
              controller.enqueue(encode('\n\n')); // separator between chunks
            }
          }

          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    } else {
      // Single request for smaller transcripts
      const completion = await openai.chat.completions.create({
        model,
        stream: true,
        messages: [
          { role: 'system', content: `${systemInstruction} respond in ${contentLanguage}` },
          {
            role: 'user',
            content: `
              ${t('videoTitle')}: ${videoTitle}
              ${t('videoDescription')}: ${videoDescription}

              ${userInstruction}
              ${transcript}`,
          },
        ],
      });

      // Create a streaming response
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          
          try {
            for await (const chunk of completion) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            }
          } catch (error) {
            controller.error(error);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    }
  } catch (error: any) {
    console.error('Error generating chapters:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// PATCH /api/summaries/chapters
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { summaryId, chapters } = await req.json();

    if (!summaryId) {
      return NextResponse.json({ error: 'Summary ID is required' }, { status: 400 });
    }

    if (!chapters) {
      return NextResponse.json({ error: 'Chapters data is required' }, { status: 400 });
    }

    // Validate chapters data structure
    if (Array.isArray(chapters)) {
      // If it's an array, validate each chapter has required fields
      const isValidArray = chapters.every(chapter => 
        chapter.start_time !== undefined && 
        chapter.heading && 
        chapter.summary && 
        chapter.keywords
      );
      if (!isValidArray) {
        return NextResponse.json({ error: 'Invalid chapters data: each chapter must have start_time, heading, summary, and keywords' }, { status: 400 });
      }
    } else if (typeof chapters === 'string') {
      // If it's a string, ensure it's not empty
      if (!chapters.trim()) {
        return NextResponse.json({ error: 'Chapters data cannot be empty' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Chapters data must be an array or string' }, { status: 400 });
    }

    // Update the summary with chapters data, ensuring user owns the summary
    const { data, error } = await supabase
      .from('summaries')
      .update({ chapters: chapters })
      .eq('id', summaryId)
      .eq('user_id', session.user.id) // Ensure user owns this summary
      .select('id, video_id')
      .single();

    if (error) {
      console.error('Supabase error saving chapters:', error);
      return NextResponse.json({ error: error.message || 'Failed to save chapters data to database' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Summary not found or you do not have permission to update it' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Chapters saved successfully', 
      summaryId: data.id, 
      videoId: data.video_id 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing request to save chapters:', error);
    return NextResponse.json({ error: error.message || 'Internal server error while saving chapters' }, { status: 500 });
  }
} 