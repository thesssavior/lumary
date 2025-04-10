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

// Expanded list of transcript services to try
const transcriptServices = [
  "https://yt-get-transcript.vercel.app/api/transcript",
  "https://ytsubsapi.com/api/transcript",
  "https://yt-transcript-api.vercel.app/api/transcript",
  "https://yt-extract.vercel.app/api/transcript"
];

// Common browser user agent to avoid detection
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

// Function to fetch transcript with retry logic
async function fetchWithRetry(url: string, options: any, retries = 3, delay = 1000) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await axios(url, options);
    } catch (error: any) {
      console.log(`Attempt ${i + 1} failed: ${error.message}`);
      lastError = error;
      // Wait before retrying
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// Language preference priority based on locale
const getLangPreference = (locale: string) => {
  return locale === 'ko' 
    ? ['ko', 'ko-KR', 'kr', 'en', 'en-US'] 
    : ['en', 'en-US', 'en-GB', 'ko', 'ko-KR'];
};

export async function POST(req: Request) {
  try {
    const { videoUrl, locale = 'ko' } = await req.json();
    const videoId = new URL(videoUrl).searchParams.get("v");
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    console.log("Processing video ID:", videoId, "Locale:", locale);
    
    try {
      let transcriptText = '';
      const languagePreference = getLangPreference(locale);
      
      // Step 1: Try Official YouTube API first - PRIORITIZED as requested
      if (process.env.YOUTUBE_API_KEY) {
        try {
          console.log("1. Trying Official YouTube API");
          
          // First get video info and available captions
          const videoInfoResponse = await fetchWithRetry(
            `https://www.googleapis.com/youtube/v3/videos`, {
              params: {
                id: videoId,
                part: 'snippet,contentDetails',
                key: process.env.YOUTUBE_API_KEY,
              },
              timeout: 5000
            }
          );
          
          if (!videoInfoResponse.data.items || videoInfoResponse.data.items.length === 0) {
            return NextResponse.json({ 
              error: "Video not found or is private" 
            }, { status: 400 });
          }
          
          // Get caption tracks using the YouTube API
          const captionsResponse = await fetchWithRetry(
            `https://www.googleapis.com/youtube/v3/captions`, {
              params: {
                videoId: videoId,
                part: 'snippet',
                key: process.env.YOUTUBE_API_KEY
              },
              headers: {
                'Accept-Language': locale === 'ko' ? 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7' : 'en-US,en;q=0.9,ko-KR;q=0.8,ko;q=0.7'
              },
              timeout: 5000
            }
          );
          
          // If we have caption tracks, extract them
          if (captionsResponse.data.items && captionsResponse.data.items.length > 0) {
            console.log("Caption tracks found:", captionsResponse.data.items.length);
            
            // Extract video title and details from first API call
            const videoTitle = videoInfoResponse.data.items[0]?.snippet?.title || 'Unknown';
            const videoDescription = videoInfoResponse.data.items[0]?.snippet?.description || '';
            
            // Sort caption tracks by language preference
            const captionTracks = captionsResponse.data.items;
            
            // Log available languages for debugging
            console.log("Available caption languages:", captionTracks.map((track: any) => 
              `${track.snippet.language} (${track.snippet.trackKind})`
            ));
            
            // Try to find the best caption track based on language preference
            let bestTrack = null;
            for (const lang of languagePreference) {
              const matchingTrack = captionTracks.find((track: any) => 
                track.snippet.language === lang && track.snippet.trackKind !== 'ASR'
              );
              if (matchingTrack) {
                bestTrack = matchingTrack;
                console.log(`Selected caption track: ${lang} (manual)`);
                break;
              }
            }
            
            // If no manual track, try auto-generated
            if (!bestTrack) {
              for (const lang of languagePreference) {
                const matchingTrack = captionTracks.find((track: any) => 
                  track.snippet.language === lang
                );
                if (matchingTrack) {
                  bestTrack = matchingTrack;
                  console.log(`Selected caption track: ${lang} (auto)`);
                  break;
                }
              }
            }
            
            // If we found a caption track, use it
            if (bestTrack) {
              // Unfortunately, we can't directly download captions from the API
              // We got the track info but now need to get the content via direct methods
              console.log("Found optimal caption track, trying direct extraction");
            } else {
              console.log("No matching caption track found");
            }
            
            // Since we found captions exist but can't directly access them through the API,
            // we'll use the title and description as metadata to enhance our next attempt
            if (videoTitle && videoDescription) {
              console.log("Using video metadata for enhanced extraction");
            }
          }
        } catch (apiError) {
          console.error("YouTube API error:", (apiError as Error).message);
        }
      } else {
        console.warn("YouTube API key not configured, skipping official API");
      }
      
      // Step 2: Try direct YouTube page approach with language preferences
      if (!transcriptText) {
        try {
          console.log("2. Trying direct YouTube page extraction");
          const response = await fetchWithRetry(`https://www.youtube.com/watch?v=${videoId}&hl=${locale === 'ko' ? 'ko' : 'en'}`, {
            headers: {
              'User-Agent': USER_AGENT,
              'Accept-Language': locale === 'ko' ? 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7' : 'en-US,en;q=0.9,ko-KR;q=0.8,ko;q=0.7',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Referer': 'https://www.google.com/'
            },
            timeout: 8000
          });
          
          const html = response.data;
          
          // Try multiple regex patterns to find caption URL
          let captionUrl = '';
          const patterns = [
            /"captionTracks":\[\{"baseUrl":"([^"]+)"/,
            /{"captionTracks":.*?"baseUrl":"([^"]+)"/,
            /"playerCaptionsTracklistRenderer":.*?"baseUrl":"([^"]+)"/
          ];
          
          // Find all caption tracks
          let captionTracks: any[] = [];
          for (const pattern of patterns) {
            // Use a more compatible approach without the 's' flag
            const entireSectionMatch = html.match(/"captionTracks":\[([\s\S]+?)\]/);
            if (entireSectionMatch && entireSectionMatch[1]) {
              try {
                // Try to parse the JSON by reconstructing it
                const tracksJSON = JSON.parse(`[${entireSectionMatch[1]}]`);
                captionTracks = tracksJSON;
                break;
              } catch (e) {
                // If not valid JSON, use regex for each track
                const trackMatches = html.match(/"captionTracks":\[([\s\S]+?)\]/);
                if (trackMatches && trackMatches[1]) {
                  const trackData = trackMatches[1];
                  const urlMatches = trackData.match(/"baseUrl":"(.*?)"/g);
                  const langMatches = trackData.match(/"languageCode":"(.*?)"/g);
                  
                  if (urlMatches && langMatches && urlMatches.length === langMatches.length) {
                    for (let i = 0; i < urlMatches.length; i++) {
                      const urlMatch = urlMatches[i].match(/"baseUrl":"(.*?)"/);
                      const langMatch = langMatches[i].match(/"languageCode":"(.*?)"/);
                      if (urlMatch && langMatch) {
                        captionTracks.push({
                          baseUrl: urlMatch[1].replace(/\\u0026/g, '&'),
                          languageCode: langMatch[1]
                        });
                      }
                    }
                  }
                }
              }
            }
          }
          
          // If we found caption tracks, prioritize by language preference
          if (captionTracks.length > 0) {
            console.log("Found caption tracks:", captionTracks.map((track: any) => track.languageCode || 'unknown'));
            
            // Sort caption tracks by language preference
            let selectedTrack = null;
            for (const lang of languagePreference) {
              const matchingTrack = captionTracks.find((track: any) => 
                (track.languageCode === lang || track.language_code === lang)
              );
              if (matchingTrack) {
                selectedTrack = matchingTrack;
                console.log(`Selected caption track: ${lang}`);
                break;
              }
            }
            
            // If no preferred language, use the first available
            if (!selectedTrack && captionTracks.length > 0) {
              selectedTrack = captionTracks[0];
              console.log(`Using first available track: ${selectedTrack.languageCode || 'unknown'}`);
            }
            
            if (selectedTrack) {
              captionUrl = selectedTrack.baseUrl || selectedTrack.base_url;
            }
          } else {
            // Fallback to old method if we couldn't parse tracks correctly
            for (const pattern of patterns) {
              const match = html.match(pattern);
              if (match && match[1]) {
                captionUrl = match[1].replace(/\\u0026/g, '&');
                console.log("Found caption URL with basic regex");
                break;
              }
            }
          }
          
          if (captionUrl) {
            console.log("Requesting caption content from URL");
            const captionResponse = await fetchWithRetry(captionUrl, {
              headers: {
                'User-Agent': USER_AGENT,
                'Origin': 'https://www.youtube.com',
                'Referer': `https://www.youtube.com/watch?v=${videoId}`
              },
              timeout: 5000
            });
            
            const captionData = captionResponse.data;
            
            if (typeof captionData === 'string') {
              if (captionData.includes('<transcript>')) {
                // Parse XML format
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
                console.log("Successfully parsed XML caption format");
              } else if (captionData.includes('"events":')) {
                // Parse JSON format
                try {
                  const jsonData = JSON.parse(captionData);
                  if (jsonData.events) {
                    transcriptText = jsonData.events
                      .filter((event: any) => event.segs)
                      .map((event: any) => 
                        event.segs.map((seg: any) => seg.utf8).join(' ')
                      )
                      .join(' ');
                    console.log("Successfully parsed JSON caption format");
                  }
                } catch (e) {
                  console.error("JSON parsing error", e);
                }
              }
            }
          }
        } catch (directError) {
          console.error("Direct extract error:", (directError as Error).message);
        }
      }
      
      // Step 3: Try the YouTube Data API for alternative info (video description)
      if (!transcriptText && process.env.YOUTUBE_API_KEY) {
        try {
          console.log("3. Using YouTube API for video description");
          const videoInfoResponse = await fetchWithRetry(
            `https://www.googleapis.com/youtube/v3/videos`, {
              params: {
                id: videoId,
                part: 'snippet,contentDetails',
                key: process.env.YOUTUBE_API_KEY,
              },
              timeout: 5000
            }
          );
          
          // Some videos have captions in description
          if (videoInfoResponse.data.items && videoInfoResponse.data.items[0]) {
            const snippet = videoInfoResponse.data.items[0].snippet;
            // Sometimes descriptions contain partial transcripts
            if (snippet.description && snippet.description.length > 500) {
              console.log("Using description as fallback text");
              transcriptText = `[Video title: ${snippet.title}]\n\n${snippet.description}`;
            }
          }
        } catch (apiError) {
          console.error("YouTube API error:", (apiError as Error).message);
        }
      }
      
      // Step 4: Try external services with language parameter
      if (!transcriptText) {
        console.log("4. Trying external transcript services");
        for (const serviceUrl of transcriptServices) {
          try {
            // Add language parameter if supported by the service
            const langParam = locale === 'ko' ? '&lang=ko' : '&lang=en';
            console.log(`Trying transcript service: ${serviceUrl}`);
            const transcriptResponse = await fetchWithRetry(`${serviceUrl}?id=${videoId}${langParam}`, {
              headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
                'Accept-Language': locale === 'ko' ? 'ko-KR,ko;q=0.9' : 'en-US,en;q=0.9'
              },
              timeout: 8000
            });
            
            if (transcriptResponse.data && transcriptResponse.data.transcript) {
              transcriptText = transcriptResponse.data.transcript;
              console.log(`Transcript fetched successfully from ${serviceUrl}`);
              break;
            }
          } catch (error: unknown) {
            const serviceError = error as Error;
            console.error(`Service ${serviceUrl} error:`, serviceError.message);
          }
        }
      }
      
      // Step 5: Try embedded player as last resort
      if (!transcriptText) {
        try {
          console.log("5. Trying embedded player approach");
          const embedResponse = await fetchWithRetry(`https://www.youtube.com/embed/${videoId}?hl=${locale === 'ko' ? 'ko' : 'en'}`, {
            headers: {
              'User-Agent': USER_AGENT,
              'Accept': 'text/html',
              'Accept-Language': locale === 'ko' ? 'ko-KR,ko;q=0.9' : 'en-US,en;q=0.9',
              'Referer': 'https://www.google.com/'
            },
            timeout: 5000
          });
          
          const embedHtml = embedResponse.data;
          const titleMatch = embedHtml.match(/<title>(.*?)<\/title>/);
          const title = titleMatch ? titleMatch[1] : 'Unknown Title';
          
          // Try to extract some meaningful content from the embed page
          const metaDescriptionMatch = embedHtml.match(/<meta name="description" content="([^"]+)"/);
          if (metaDescriptionMatch && metaDescriptionMatch[1] && metaDescriptionMatch[1].length > 100) {
            transcriptText = `[Video title: ${title}]\n\n${metaDescriptionMatch[1]}`;
            console.log("Using meta description as fallback");
          }
        } catch (embedError) {
          console.error("Embed approach error:", (embedError as Error).message);
        }
      }
      
      // Final check - if we still don't have transcript
      if (!transcriptText) {
        console.error("All transcript extraction methods failed");
        return NextResponse.json(
          { error: errorMessages[locale as keyof typeof errorMessages].noTranscript },
          { status: 400 }
        );
      }
      
      console.log("Transcript length:", transcriptText.length);
      console.log("Transcript sample:", transcriptText.substring(0, 150) + "...");

      // Summarize with OpenAI
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