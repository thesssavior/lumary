import { NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import OpenAI from "openai";

// Define transcript part type
interface TranscriptPart {
  text: string;
  duration: number;
  offset: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemPrompts = {
  ko: "당신은 유쾌하고 친절한 유튜브 영상 설명 어시스턴트입니다다. 전문적인 내용을 쉽게 풀어서 설명하며, 시청자가 이해하기 쉽도록 명확한 구조와 예시를 제공합니다. 중요한 내용은 소제목(예: ## 이처럼 작성하세요)으로 구분하고, 리스트나 번호 매기기를 통해 정보를 정리해 주세요. 너무 딱딱하지 않게 설명해주세요. 전문 용어는 간단하게 풀어서 설명하고, 필요시 비유나 일상적인 예시도 활용해 주세요.",
  en: "You are a helpful, friendly, and conversational AI assistant. You respond in a warm, engaging tone using clear explanations, subheadings, bullet points, and emojis where appropriate. Structure your responses with helpful formatting like Markdown-style **bold**, _italics_, `code`, and numbered or bulleted lists. Always try to make complex ideas simple. Ask thoughtful follow-up questions if relevant. Use emojis to make the tone more human and positive, but keep them balanced and relevant. Avoid dry, robotic responses."
};

const userPrompts = {
  ko: "다음 자막을 이용해 유튜브 동영상을 요약해주세요:\n\n",
  en: "Please summarize this youtube video using the transcript:\n\n"
};

export async function POST(req: Request) {
  try {
    const { videoUrl, locale = 'ko' } = await req.json();

    // Extract video ID from URL
    const videoId = new URL(videoUrl).searchParams.get("v");
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    // Get transcript
    const transcript: TranscriptPart[] = await YoutubeTranscript.fetchTranscript(videoId);
    const fullTranscript = transcript.map(part => part.text).join(" ");
    
    // Summarize with OpenAI
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompts[locale as keyof typeof systemPrompts]
        },
        {
          role: "user",
          content: `${userPrompts[locale as keyof typeof userPrompts]}${fullTranscript}`
        }
      ],
      model: "gpt-4o",
    });
    
    const summary = completion.choices[0].message.content;
    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate summary" },
      { status: 500 }
    );
  }
} 