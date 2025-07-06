import { GoogleGenAI } from "@google/genai";
import { getTranslations } from "next-intl/server";

const ai = new GoogleGenAI({});

export async function POST(request: Request) {
  const { transcript, contentLanguage } = await request.json();
  
  // Use the contentLanguage to get proper locale, fallback to 'ko' if not provided
  const locale = (contentLanguage === 'en') ? 'en' : 'ko';
  const t = await getTranslations({ locale, namespace: 'Chapters' });
  const systemInstruction = t('systemInstruction');
  const userInstruction = t('userInstruction');

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
    const response = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: userInstruction + "\n\n" + transcript,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          for await (const chunk of response) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
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