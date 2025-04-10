import { NextResponse } from 'next/server';
import axios from 'axios';
import OpenAI from 'openai';

// Check API keys at startup
if (!process.env.OPENAI_API_KEY || !process.env.YOUTUBE_API_KEY) {
  console.error("Missing API keys: Ensure OPENAI_API_KEY and YOUTUBE_API_KEY are set in Vercel.");
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Your prompts and error messages
const systemPrompts = {
  ko: "당신은 유쾌하고 친절한 유튜브 영상 설명 어시스턴트입니다. 전문적인 내용을 쉽게 풀어서 설명하며, 시청자가 이해하기 쉽도록 명확한 구조와 예시를 제공합니다. 중요한 내용은 소제목(예: ## 이처럼 작성하세요)으로 구분하고, 리스트나 번호 매기기를 통해 정보를 정리해 주세요.",
  en: "You are a helpful, friendly, and conversational YouTube video summarizer. You respond in a warm, engaging tone using clear explanations, subheadings, bullet points, and numbered lists. Structure your responses with helpful formatting like Markdown-style **bold**, _italics_, and numbered or bulleted lists. Always try to make complex ideas simple."
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

export async function POST(req: Request) {
  try {
    const { videoUrl, locale = 'ko' } = await req.json();
    const videoId = new URL(videoUrl).searchParams.get("v");
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    console.log("Processing video ID:", videoId, "Locale:", locale);
    let transcriptText = '';

    // Step 1: Use YouTube Data API to fetch transcript
    try {
      console.log("1. Trying Official YouTube API");

      // Get caption tracks
      const captionsResponse = await axios.get(
        `https://www.googleapis.com/youtube/v3/captions`, {
          params: {
            videoId,
            part: 'snippet',
            key: process.env.YOUTUBE_API_KEY,
          },
        }
      );

      const captionTracks = captionsResponse.data.items;
      if (!captionTracks || captionTracks.length === 0) {
        console.log("No caption tracks available");
        throw new Error("No captions found");
      }

      console.log("Available caption languages:", captionTracks.map((t: any) => t.snippet.language));

      // Pick the best track (prefer manual over auto-generated)
      let bestTrack = captionTracks.find((t: any) => t.snippet.trackKind !== 'asr') || captionTracks[0];
      console.log(`Selected caption track: ${bestTrack.snippet.language} (${bestTrack.snippet.trackKind})`);

      // Fetch the transcript using the track ID
      const transcriptResponse = await axios.get(
        `https://www.googleapis.com/youtube/v3/captions/${bestTrack.id}`, {
          params: {
            key: process.env.YOUTUBE_API_KEY,
            tfmt: 'sbv', // Simple subtitle format
          },
        }
      );

      // Parse SBV format
      const sbvContent = transcriptResponse.data;
      const lines = sbvContent.split('\n');
      let fullTranscript = '';
      for (let i = 0; i < lines.length; i++) {
        if (i % 2 === 1 && lines[i].trim()) { // Text lines are odd-numbered
          fullTranscript += lines[i].trim() + " ";
        }
      }
      transcriptText = fullTranscript.trim();
      console.log("Parsed transcript length:", transcriptText.length);
    } catch (apiError: any) {
      console.error("YouTube API error:", apiError.message);
    }

    // Step 2: Fallback to description if no transcript
    if (!transcriptText) {
      console.log("2. Falling back to video description");
      const videoResponse = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos`, {
          params: {
            id: videoId,
            part: 'snippet',
            key: process.env.YOUTUBE_API_KEY,
          },
        }
      );

      const videoData = videoResponse.data.items[0]?.snippet;
      if (videoData && videoData.description) {
        transcriptText = `[Video title: ${videoData.title}]\n\n${videoData.description}`;
        console.log("Using description as transcript, length:", transcriptText.length);
      }
    }

    // Step 3: Check if we have a transcript
    if (!transcriptText.trim()) {
      console.error("No transcript available");
      return NextResponse.json(
        { error: errorMessages[locale as keyof typeof errorMessages].noTranscript },
        { status: 400 }
      );
    }

    // Trim if too long for OpenAI
    if (transcriptText.length > 60000) {
      console.log("Trimming transcript from", transcriptText.length, "to 60000 chars");
      transcriptText = transcriptText.substring(0, 60000);
    }

    // Step 4: Summarize with OpenAI
    try {
      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompts[locale as keyof typeof systemPrompts] },
          { role: "user", content: `${userPrompts[locale as keyof typeof userPrompts]}${transcriptText}` },
        ],
        model: "gpt-4o",
        max_tokens: 2000,
        temperature: 0.7,
      });

      const summary = completion.choices[0]?.message.content;
      if (!summary) {
        console.error("OpenAI returned no summary");
        return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
      }

      console.log("Summary generated, length:", summary.length);
      return NextResponse.json({ summary });
    } catch (openaiError: any) {
      console.error("OpenAI error:", openaiError.message);
      return NextResponse.json({ error: `OpenAI failed: ${openaiError.message}` }, { status: 500 });
    }

  } catch (error: any) {
    console.error("General error:", error.message);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}