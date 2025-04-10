import { NextResponse } from 'next/server';
import axios from 'axios';
import OpenAI from 'openai';

// Check for required API keys
if (!process.env.OPENAI_API_KEY) {
  console.error("OpenAI API key is missing");
}

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get prompts from messages files
const systemPrompts = {
  ko: "당신은 유쾌하고 친절한 유튜브 영상 설명 어시스턴트입니다다. 전문적인 내용을 쉽게 풀어서 설명하며, 시청자가 이해하기 쉽도록 명확한 구조와 예시를 제공합니다. 중요한 내용은 소제목(예: ## 이처럼 작성하세요)으로 구분하고, 리스트나 번호 매기기를 통해 정보를 정리해 주세요. 너무 딱딱하지 않게 설명해주세요. 전문 용어는 간단하게 풀어서 설명하고, 필요시 비유나 일상적인 예시도 활용해 주세요.",
  en: "You are a helpful, friendly, and conversational AI assistant. You respond in a warm, engaging tone using clear explanations, subheadings, bullet points, and emojis where appropriate. Structure your responses with helpful formatting like Markdown-style **bold**, _italics_, `code`, and numbered or bulleted lists. Always try to make complex ideas simple. Ask thoughtful follow-up questions if relevant. Use emojis to make the tone more human and positive, but keep them balanced and relevant. Avoid dry, robotic responses."
};

const userPrompts = {
  ko: "다음 자막을 이용해 유튜브 동영상을 요약해주세요:\n\n",
  en: "Please summarize this youtube video using the transcript:\n\n"
};

const errorMessages = {
  ko: {
    noTranscript: "이 동영상에 사용 가능한 자막이 없습니다. 자막이 활성화된 다른 동영상을 시도해보세요.",
    apiError: "YouTube API 오류가 발생했습니다. 다시 시도해주세요.",
    missingApiKey: "서버 설정 오류: YouTube API 키가 구성되지 않았습니다."
  },
  en: {
    noTranscript: "No transcript is available for this video. Please try a different video that has captions enabled.",
    apiError: "A YouTube API error occurred. Please try again.",
    missingApiKey: "Server configuration error: YouTube API key is not configured."
  }
};

// Simplified transcript services list - only use the most reliable one
const transcriptServices = [
  "https://yt-get-transcript.vercel.app/api/transcript"
];

export async function POST(req: Request) {
  try {
    const { videoUrl, locale = 'ko' } = await req.json();
    const videoId = new URL(videoUrl).searchParams.get("v");
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    console.log("Processing video ID:", videoId);
    
    try {
      // Step 1: Try to get video info (but skip if no API key to save time)
      if (!process.env.YOUTUBE_API_KEY) {
        console.error("YouTube API key not configured");
        return NextResponse.json({ error: "YouTube API key not configured" }, { status: 500 });
      }
  
      if (process.env.YOUTUBE_API_KEY) {
        const videoInfoResponse = await axios.get(
          `https://www.googleapis.com/youtube/v3/videos`, {
            params: {
              id: videoId,
              part: 'snippet',
              key: process.env.YOUTUBE_API_KEY,
            },
            timeout: 10000 // 10-second timeout
          }
        );

        if (!videoInfoResponse.data.items || videoInfoResponse.data.items.length === 0) {
          return NextResponse.json({ 
            error: "Video not found or is private" 
          }, { status: 400 });
        }
      }
      
      // Step 2: Try to get transcript - prioritize direct approach first since it worked
      let transcriptText = '';
      
      // Try direct YouTube approach first (this worked in logs)
      try {
        console.log("Trying direct YouTube API approach");
        const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
          timeout: 5000 // 5-second timeout
        });
        const html = response.data;
        
        // Extract transcript from YouTube page
        const captionTrackMatch = html.match(/"captionTracks":\[\{"baseUrl":"([^"]+)"/);
        if (captionTrackMatch && captionTrackMatch[1]) {
          const captionUrl = captionTrackMatch[1].replace(/\\u0026/g, '&');
          console.log("Found caption URL:", captionUrl);
          
          const captionResponse = await axios.get(captionUrl, {
            timeout: 5000 // 5-second timeout
          });
          const captionData = captionResponse.data;
          
          // Parse XML format
          if (typeof captionData === 'string' && captionData.includes('<transcript>')) {
            const textSegments = captionData.match(/<text[^>]*>(.*?)<\/text>/g) || [];
            transcriptText = textSegments
              .map(segment => {
                const textMatch = segment.match(/<text[^>]*>(.*?)<\/text>/);
                return textMatch ? textMatch[1].replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'") : '';
              })
              .join(' ');
          }
        }
      } catch (directError) {
        console.error("Direct extract error:", (directError as Error).message);
      }
      
      // If direct approach failed, try transcript services with shorter timeout
      if (!transcriptText) {
        for (const serviceUrl of transcriptServices) {
          try {
            console.log(`Trying transcript service: ${serviceUrl}`);
            const transcriptResponse = await axios.get(`${serviceUrl}?id=${videoId}`, {
              timeout: 3000 // 3-second timeout (reduced from 10 seconds)
            });
            
            if (transcriptResponse.data && transcriptResponse.data.transcript) {
              transcriptText = transcriptResponse.data.transcript;
              console.log(`Transcript fetched successfully from ${serviceUrl}`);
              break;
            }
          } catch (error: unknown) {
            const serviceError = error as Error;
            console.error(`Service ${serviceUrl} error:`, serviceError.message);
            // Continue to the next service
          }
        }
      }
      
      // If all methods failed
      if (!transcriptText) {
        console.error("All transcript extraction methods failed");
        return NextResponse.json(
          { error: errorMessages[locale as keyof typeof errorMessages].noTranscript },
          { status: 400 }
        );
      }
      
      console.log("Transcript length:", transcriptText.length);
      console.log("Transcript sample:", transcriptText.substring(0, 150) + "...");

      // Step 3: Summarize with OpenAI
      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompts[locale as keyof typeof systemPrompts] },
          { role: "user", content: `${userPrompts[locale as keyof typeof userPrompts]}${transcriptText}` }
        ],
        model: "gpt-4o",
      });
      
      const summary = completion.choices[0].message.content;
      return NextResponse.json({ summary });
      
    } catch (error: any) {
      console.error("Error:", error.message);
      
      if (error.message.includes("transcript") || error.message.includes("404")) {
        return NextResponse.json(
          { error: errorMessages[locale as keyof typeof errorMessages].noTranscript },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: errorMessages[locale as keyof typeof errorMessages].apiError },
        { status: 400 }
      );
    }
    
  } catch (error: any) {
    console.error("General error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to generate summary" },
      { status: 500 }
    );
  }
}