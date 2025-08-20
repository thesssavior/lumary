import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@/auth';

const model = 'gpt-5-mini';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export async function POST(req: NextRequest) {
  try {
    const { 
      message, 
      videoTitle, 
      summary, 
      chapters, 
      transcript, 
      contentLanguage, 
      videoId, 
      summaryId,
      conversationHistory 
    } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Build context from available video data
    let videoContext = '';
    
    if (videoTitle) {
      videoContext += `Video Title: "${videoTitle}"\n\n`;
    }

    if (summary) {
      videoContext += `Video Summary:\n${summary}\n\n`;
    }

    if (chapters && chapters.length > 0) {
      videoContext += `Video Chapters:\n`;
      chapters.forEach((chapter: any, index: number) => {
        if (chapter.heading && chapter.summary) {
          const startTime = chapter.start_time || `Chapter ${index + 1}`;
          videoContext += `${startTime} - ${chapter.heading}: ${chapter.summary}\n`;
        }
      });
      videoContext += '\n';
    }

    //if (transcript) {
      // Include a truncated version of transcript for context (first 2000 chars)
      //const truncatedTranscript = transcript.length > 2000 ? 
      //  transcript.substring(0, 2000) + '...' : transcript;
      //videoContext += `Video Transcript (partial):\n${truncatedTranscript}\n\n`;
    //}

    const systemInstruction = `
You are an AI assistant specialized in helping users understand and discuss video content. You have access to the video's title, summary, chapters, and transcript.

Your role is to:
1. Answer questions about the video content accurately and helpfully
2. Provide insights and explanations based on the available video data
3. Help users understand key concepts, themes, and takeaways
4. Reference specific parts of the video when relevant (using timestamps if available)
5. Encourage deeper thinking and learning about the content

Guidelines:
- Be conversational and engaging
- Use the video context to provide specific, relevant answers
- When referencing video content, mention timestamps or chapter references when available
- If you don't have enough information to answer a question, be honest about limitations
- Encourage follow-up questions and deeper exploration of topics
- Respond in ${contentLanguage || 'English'} language
- Keep responses focused and not overly long (2-4 paragraphs typically)

Video Context:
${videoContext}

Remember: Your goal is to help the user get the most value from this video content through interactive discussion.
`;

    // Build conversation context from history
    const chatMessages = [
      { role: 'system', content: systemInstruction },
    ];

    // Add recent conversation history for context (last few messages)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-6); // Last 6 messages for context
      recentHistory.forEach((msg: ChatMessage) => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          chatMessages.push({
            role: msg.role,
            content: msg.content
          });
        }
      });
    }

    // Add the current user message
    chatMessages.push({
      role: 'user',
      content: message
    });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Create streaming completion
    const stream = await openai.chat.completions.create({
      model,
      messages: chatMessages as any[],
      stream: true,
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Create a ReadableStream for the response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error: any) {
    console.error('Error in chat endpoint:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
