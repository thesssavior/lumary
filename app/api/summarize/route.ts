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

// More reliable transcript services - removed unreliable ones
const transcriptServices = [
  "https://yt-get-transcript.vercel.app/api/transcript"
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

// Safe JSON parse with fallback
function safeJsonParse(text: string, fallback: any = null) {
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON parsing error:", e);
    return fallback;
  }
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
      let videoTitle = '';
      let videoDescription = '';
      
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
          
          // Store video info for later use
          if (videoInfoResponse.data.items[0]?.snippet) {
            videoTitle = videoInfoResponse.data.items[0].snippet.title || '';
            videoDescription = videoInfoResponse.data.items[0].snippet.description || '';
          }
          
          // Get caption tracks using the YouTube API
          try {
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
              
              // Sort caption tracks by language preference
              const captionTracks = captionsResponse.data.items;
              
              // Log available languages for debugging
              console.log("Available caption languages:", captionTracks.map((track: any) => 
                `${track.snippet.language}${track.snippet.trackKind === 'asr' ? ' (asr)' : ''}`
              ));
              
              // Try to find the best caption track based on language preference
              let bestTrack = null;
              // First prefer manual captions in preferred language
              for (const lang of languagePreference) {
                const matchingTrack = captionTracks.find((track: any) => 
                  track.snippet.language === lang && track.snippet.trackKind !== 'asr'
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
                    console.log(`Selected caption track: ${lang} (${matchingTrack.snippet.trackKind})`);
                    break;
                  }
                }
              }
              
              // If we found a caption track, note it for later (we can't download it directly from API)
              if (bestTrack) {
                console.log(`Found caption track: ${bestTrack.snippet.language}, trackId: ${bestTrack.id}`);
              }
            }
          } catch (captionError) {
            console.error("Caption API error:", (captionError as Error).message);
          }
          
          // Use video description as fallback if necessary
          if (videoDescription && videoDescription.length > 500) {
            console.log("Storing description for potential use as fallback");
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
          
          // First try to find the caption tracks section
          const entireSectionMatch = html.match(/"captionTracks":\[([\s\S]+?)\]/);
          if (entireSectionMatch && entireSectionMatch[1]) {
            console.log("Found caption tracks section");
            try {
              // Try to parse the JSON by reconstructing it
              const tracksJSON = safeJsonParse(`[${entireSectionMatch[1]}]`, []);
              if (Array.isArray(tracksJSON) && tracksJSON.length > 0) {
                captionTracks = tracksJSON;
                console.log(`Parsed ${captionTracks.length} caption tracks from JSON`);
              }
            } catch (e) {
              console.error("JSON parse error:", e);
              // If not valid JSON, use regex for each track
              const trackData = entireSectionMatch[1];
              const urlMatches = trackData.match(/"baseUrl":"(.*?)"/g) || [];
              const langMatches = trackData.match(/"languageCode":"(.*?)"/g) || [];
              
              if (urlMatches.length > 0 && langMatches.length > 0) {
                console.log(`Found ${urlMatches.length} tracks using regex`);
                for (let i = 0; i < Math.min(urlMatches.length, langMatches.length); i++) {
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
            console.log("Trying fallback regex method for caption URL");
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
            try {
              const captionResponse = await fetchWithRetry(captionUrl, {
                headers: {
                  'User-Agent': USER_AGENT,
                  'Origin': 'https://www.youtube.com',
                  'Referer': `https://www.youtube.com/watch?v=${videoId}`
                },
                timeout: 8000,
                responseType: 'text'
              });
              
              if (captionResponse.status === 200) {
                const captionData = captionResponse.data;
                
                if (typeof captionData === 'string') {
                  if (captionData.includes('<transcript>')) {
                    // Parse XML format
                    console.log("Parsing XML caption format");
                    const textSegments = captionData.match(/<text[^>]*>(.*?)<\/text>/g) || [];
                    if (textSegments.length > 0) {
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
                      console.log(`Successfully parsed XML caption format with ${textSegments.length} segments`);
                    } else {
                      console.log("No text segments found in XML caption");
                    }
                  } else if (captionData.includes('"events":')) {
                    // Parse JSON format
                    console.log("Parsing JSON caption format");
                    try {
                      const jsonData = safeJsonParse(captionData, null);
                      if (jsonData && jsonData.events) {
                        const filteredEvents = jsonData.events.filter((event: any) => event.segs);
                        if (filteredEvents.length > 0) {
                          transcriptText = filteredEvents
                            .map((event: any) => 
                              event.segs.map((seg: any) => seg.utf8).join(' ')
                            )
                            .join(' ');
                          console.log(`Successfully parsed JSON caption format with ${filteredEvents.length} events`);
                        } else {
                          console.log("No valid events with segments found in JSON caption");
                        }
                      } else {
                        console.log("Invalid JSON caption format or missing events");
                      }
                    } catch (e) {
                      console.error("JSON parsing error:", e);
                    }
                  } else {
                    console.log("Caption data format not recognized");
                    console.log("Caption data starts with:", captionData.substring(0, 100));
                  }
                } else {
                  console.log("Caption data is not a string:", typeof captionData);
                }
              } else {
                console.log("Caption request returned status:", captionResponse.status);
              }
            } catch (captionError) {
              console.error("Error fetching caption:", (captionError as Error).message);
            }
          } else {
            console.log("No caption URL found");
          }
        } catch (directError) {
          console.error("Direct extract error:", (directError as Error).message);
        }
      }
      
      // Step 3: If extraction failed but we have video info, use description as transcript
      if (!transcriptText && videoTitle && videoDescription && videoDescription.length > 300) {
        console.log("3. Using video description as transcript");
        transcriptText = `[Video title: ${videoTitle}]\n\n${videoDescription}`;
      }
      
      // Step 4: Try invidious API as alternative (more reliable than custom API services)
      if (!transcriptText) {
        try {
          console.log("4. Trying Invidious API");
          const langCode = locale === 'ko' ? 'ko' : 'en';
          const response = await fetchWithRetry(`https://invidious.snopyta.org/api/v1/videos/${videoId}?fields=title,description`, {
            timeout: 8000,
            headers: {
              'User-Agent': USER_AGENT
            }
          });
          
          if (response.data && response.data.title) {
            if (!videoTitle) videoTitle = response.data.title;
            if (!videoDescription && response.data.description) {
              videoDescription = response.data.description;
              if (videoDescription.length > 300) {
                console.log("Using Invidious description as transcript");
                transcriptText = `[Video title: ${videoTitle}]\n\n${videoDescription}`;
              }
            }
          }
          
          // Try to get captions from Invidious if we still don't have a transcript
          if (!transcriptText) {
            const captionsResponse = await fetchWithRetry(`https://invidious.snopyta.org/api/v1/captions/${videoId}?&hl=${langCode}`, {
              timeout: 8000,
              headers: {
                'User-Agent': USER_AGENT
              }
            });
            
            if (captionsResponse.data && Array.isArray(captionsResponse.data.captions)) {
              console.log(`Found ${captionsResponse.data.captions.length} captions via Invidious`);
              // Find best language match
              let bestCaptionUrl = null;
              for (const lang of languagePreference) {
                const caption = captionsResponse.data.captions.find((c: any) => c.languageCode === lang);
                if (caption) {
                  bestCaptionUrl = `https://invidious.snopyta.org/api/v1/captions/${videoId}?label=${caption.label}`;
                  console.log(`Selected caption: ${caption.label}`);
                  break;
                }
              }
              
              if (bestCaptionUrl) {
                const captionContent = await fetchWithRetry(bestCaptionUrl, {
                  timeout: 8000,
                  headers: {
                    'User-Agent': USER_AGENT
                  }
                });
                
                if (captionContent.data && typeof captionContent.data === 'string') {
                  // Usually in WebVTT format
                  const lines = captionContent.data.split('\n');
                  const textLines = lines.filter(line => 
                    !line.includes('-->') && 
                    !line.match(/^\d+$/) && 
                    line.trim().length > 0 &&
                    !line.startsWith('WEBVTT')
                  );
                  
                  if (textLines.length > 0) {
                    transcriptText = textLines.join(' ');
                    console.log(`Extracted ${textLines.length} lines from Invidious captions`);
                  }
                }
              }
            }
          }
        } catch (invidiousError) {
          console.error("Invidious API error:", (invidiousError as Error).message);
        }
      }
      
      // Final check - if all methods failed but we have title/description, use that
      if (!transcriptText && videoTitle) {
        console.log("All transcript extraction methods failed, using video metadata as fallback");
        let fallbackText = `[Video title: ${videoTitle}]`;
        if (videoDescription) {
          fallbackText += `\n\n${videoDescription}`;
        }
        transcriptText = fallbackText;
      }
      
      // If we still have nothing, return error
      if (!transcriptText) {
        console.error("All transcript extraction methods failed with no fallback");
        return NextResponse.json(
          { error: errorMessages[locale as keyof typeof errorMessages].noTranscript },
          { status: 400 }
        );
      }
      
      console.log("Transcript length:", transcriptText.length);
      console.log("Transcript sample:", transcriptText.substring(0, 150) + "...");

      // Summarize with OpenAI
      try {
        const completion = await openai.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompts[locale as keyof typeof systemPrompts] },
            { role: "user", content: `${userPrompts[locale as keyof typeof userPrompts]}${transcriptText}` }
          ],
          model: "gpt-4o",
        });
        
        const summary = completion.choices[0].message.content;
        return NextResponse.json({ summary });
      } catch (openaiError) {
        console.error("OpenAI API error:", (openaiError as Error).message);
        return NextResponse.json(
          { error: "Failed to generate summary. Please try again later." },
          { status: 500 }
        );
      }
      
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
    // Ensure we always return valid JSON
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}