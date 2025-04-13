import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import enMessages from '@/messages/en.json';
import koMessages from '@/messages/ko.json';
import { YoutubeTranscript } from 'youtube-transcript';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to format seconds into HH:MM:SS
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export async function POST(req: Request) {
  try {
    const { videoId, locale = 'ko' } = await req.json();
    const messages = locale === 'ko' ? koMessages : enMessages;
    
    if (!videoId) {
      return NextResponse.json(
        { error: messages.error },
        { status: 400 }
      );
    }

    let transcriptText = '';
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    // Format each transcript item with timestamp
    transcriptText = transcript.map(item => 
      `[${formatTime(item.offset)}] ${item.text}`
    ).join('\n');

    if (!transcriptText) {
      return NextResponse.json(
        { error: messages.error },
        { status: 400 }
      );
    }

    // Trim if too long for OpenAI
    const trimmedTranscript = transcriptText.length > 60000 
      ? transcriptText.substring(0, 60000)
      : transcriptText;

    // Summarize with OpenAI
    try {
      const openaiMessages = [
        { 
          role: "system" as const, 
          content: messages.systemPrompts
        },
        { 
          role: "user" as const, 
          content: `${messages.userPrompts}\n\n${trimmedTranscript}` 
        },
      ];
      
      const completion = await openai.chat.completions.create({
        messages: openaiMessages,
        model: "gpt-4o",
        max_tokens: 2000,
        temperature: 0.3,
      });

      if (!completion?.choices?.[0]?.message?.content) {
        console.error("Invalid response from OpenAI");
        return NextResponse.json({ 
          error: messages.error 
        }, { status: 500 });
      }

      const summary = completion.choices[0].message.content;
      
      return NextResponse.json({ summary });
    } catch (openaiError: any) {
      console.error("OpenAI error:", openaiError.message);
      
      return NextResponse.json(
        { error: `${messages.error} ${openaiError.message}` },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error("General error:", error.message);
    
    return NextResponse.json(
      { error: `${error.message}` },
      { status: 500 }
    );
  }
}