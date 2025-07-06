import { NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";
import { getTranslations } from "next-intl/server";

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
      const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
      };

      return `[Chapter ${index + 1}] ${formatTime(chapter.start_time)} - "${chapter.heading}"
        Summary: ${chapter.summary}
        Keywords: ${chapter.keywords}
        Citation Reference: [CH${index + 1}@${formatTime(chapter.start_time)}]`;
    }).join('\n\n');

    // Enhanced system prompt for citation and indexing
    // const systemPrompt = `${systemPrompts}`;
    const systemPrompt = `You are a YouTube video summary generator. You will be given a video title, description, and chapters with indexing data.

Your task is to create a comprehensive, well-structured summary using appropriate Markdown for formatting.

**Formatting Guidelines:**
- Use headings (#) and subheadings (##, ###) to organize the content logically.
- Use bullet points (*) or numbered lists (1.) for key takeaways, lists of items, or sequential steps.
- Use bold text (**) to highlight important concepts and keywords.
- Ensure  (ecitations.g., [CH1@0:45]) are naturally integrated within the text.
- The entire response should be a single Markdown document.

The goal is to produce a summary that is not only informative but also easy to read and skim. The content should be highly searchable and well-organized.`
    const userPrompt = `${userPrompts}

      Video Title: ${videoTitle}
      Video Description: ${videoDescription}

      CHAPTERS WITH INDEXING DATA:
      ${chaptersContent}

      Please create a comprehensive summary with proper citations
      and indexing as specified in the system instructions. 
      Ensure citations are naturally integrated 
      and the content is highly searchable.`;

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
