import { NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";
import { getTranslations } from "next-intl/server";
import { formatTime } from '@/lib/utils';
import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabaseClient';

// Initialize Gemini AI
const ai = new GoogleGenAI({});

// POST request to summarize a video using chapters with Gemini 2.5 Flash
export async function POST(req: Request) {
  try {
    console.log("summaries/summarize2 route called with Gemini 2.5 Flash");
    
    // Get data from request
    const { 
      contentLanguage = 'ko',
      chapters, // We expect chapters data instead of raw transcript
      title, 
      videoDescription,
    } = await req.json();
    
    // Use the contentLanguage to get proper locale, only support 'ko' and 'en'
    // ko is default for languages other than en
    // const locale = (contentLanguage === 'en') ? 'en' : 'ko';
    const locale = 'en';
    const t = await getTranslations({ locale, namespace: 'Summarize2' });
    const systemPrompts = t('systemPrompts');
    const userPrompts = t('userPrompts');
    
    const videoTitle = title || ''; 

    if (!chapters) { 
      return NextResponse.json({ error: 'Invalid request: chapters are required' }, { status: 400 });
    }

    // Parse chapters if they're in string format
    let parsedChapters;
    try {
      parsedChapters = typeof chapters === 'string' ? JSON.parse(chapters) : chapters;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid chapters format' }, { status: 400 });
    }

    if (!Array.isArray(parsedChapters) || parsedChapters.length === 0) {
      return NextResponse.json({ error: 'No chapters available for summarization' }, { status: 400 });
    }

    // Create structured chapter content for the AI with citations
    const chaptersContent = parsedChapters.map((chapter, index) => {
      return `[Chapter ${index + 1}] ${formatTime(chapter.start_time)} - "${chapter.heading}"
        Summary: ${chapter.summary}
        Keywords: ${chapter.keywords}
        Citation Reference: [CH${index + 1}@${formatTime(chapter.start_time)}]`;
    }).join('\n\n');

    // Enhanced system prompt for citation and indexing
    const systemPrompt = `${systemPrompts}`;
    const userPrompt = `
      ${t('videoTitle')}: ${videoTitle}
      ${t('videoDescription')}: ${videoDescription}
      ${t('chaptersContent')}: ${chaptersContent}
      ${t('userPrompts')}
    `;

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.3,
              // topP: 0.95,
              // topK: 40,
            },
          });
          
          for await (const chunk of response) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (error) {
          console.error("Gemini 2.5 Flash streaming error:", error);
          controller.error(error);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      }
    });
  } catch (error: any) {
    console.error("Gemini 2.5 Flash API error:", error.message);
    return NextResponse.json({ 
      error: `Chapter-based summarization failed: ${error.message}`,
    }, { status: 500 });
  }
}

// PATCH /api/summaries/summarize2
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { summaryId, summary } = await req.json();

    if (!summaryId) {
      return NextResponse.json({ error: 'Summary ID is required' }, { status: 400 });
    }

    if (!summary) {
      return NextResponse.json({ error: 'Summary content is required' }, { status: 400 });
    }

    // Update the summary with generated content, ensuring user owns the summary
    // output_token_count uses another method for gemini-2.5-flash
    const updateData: any = {
      summary: summary,
    };

    const { data, error } = await supabase
      .from('summaries')
      .update(updateData)
      .eq('id', summaryId)
      .eq('user_id', session.user.id) // Ensure user owns this summary
      .select('id, video_id, name')
      .single();

    if (error) {
      console.error('Supabase error saving summary:', error);
      return NextResponse.json({ error: error.message || 'Failed to save summary data to database' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Summary not found or you do not have permission to update it' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Summary saved successfully', 
      summaryId: data.id, 
      videoId: data.video_id,
      name: data.name
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing request to save summary:', error);
    return NextResponse.json({ error: error.message || 'Internal server error while saving summary' }, { status: 500 });
  }
}
