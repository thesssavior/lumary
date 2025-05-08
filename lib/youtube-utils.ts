import { YoutubeTranscript } from 'youtube-transcript';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { formatTime } from '@/lib/utils'; // Assuming formatTime is in @/lib/utils

// Constants
const proxyUrls = [
  'http://toehivex:esiwn5hn17xs@p.webshare.io:80/',
  'http://pUUJm81Z0iLPUl2t:G8MtlvbQ73fGcsxh@geo.iproyal.com:12321',
  'http://brd-customer-hl_414d8129-zone-residential_proxy1:yd55dtlsq03w@brd.superproxy.io:33335',
  'http://user-sp1d2iv3s7-country-kr-city-seoul:QY0p3ewONhqn92_kau@gate.decodo.com:10001',
  // Other proxies can be added here if needed
];

// Helper to try proxies in order
async function fetchTranscriptWithFallback(videoId: string) {
  let lastError;
  for (const proxyUrl of proxyUrls) {
    try {
      const agent = new HttpsProxyAgent(proxyUrl);
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        fetchOptions: { agent } as any
      } as any);
      if (transcript && transcript.length > 0) {
        return transcript;
      }
      // If transcript is empty or undefined, treat it as an error to try next proxy
      throw new Error('Empty transcript received from proxy: ' + proxyUrl);
    } catch (err: any) {
      lastError = err;
      console.error(`Proxy failed: ${proxyUrl}`, err && err.message ? err.message : String(err));
    }
  }
  // If all proxies fail and we have a lastError, throw it.
  // If lastError is undefined (e.g., proxyUrls is empty), throw a generic error.
  throw lastError || new Error('All proxies failed to fetch transcript and no specific error was caught.');
}

// Helper to fetch transcript from a cloudflare/custom endpoint
async function fetchTranscriptFromCloudflare(videoId: string) {
  const endpoint = 'https://pi.lumarly.com/fetch-transcript'; // Centralized endpoint
  const SECRET_TOKEN = 'Tmdwn123098'; // Securely manage this token
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': SECRET_TOKEN,
    },
    body: JSON.stringify({ video_id: videoId }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error('Failed to fetch transcript from Cloudflare endpoint:', res.status, errorText);
    throw new Error(`Failed to fetch transcript from Cloudflare endpoint: ${res.status} ${errorText}`);
  }
  const data = await res.json();
  if (!data.transcript || !Array.isArray(data.transcript)) {
    console.error('Transcript not found or invalid format in Cloudflare response:', data);
    throw new Error('Transcript not found or invalid format in Cloudflare response');
  }
  return data.transcript;
}

// Helper function to format transcript items
function formatTranscript(transcript: any[], timeProperty: string = 'offset'): string {
  if (!transcript || transcript.length === 0) {
    return ""; // Return empty string if transcript is null, undefined, or empty
  }
  return transcript.map((item: any, idx: number) =>
    idx % 4 === 0
      ? `[${formatTime(item[timeProperty])}] ${item.text}`
      : item.text
  ).join('\\n');
}

// Fetch YouTube video title and description using YouTube Data API v3
async function fetchYoutubeInfo(videoId: string): Promise<{ title: string; description: string } | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('YOUTUBE_API_KEY is not set');
    return null;
  }
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error('YouTube API response not ok:', res.status, await res.text());
    return null;
  }
  const data = await res.json();
  if (!data.items || !data.items[0]) {
    console.error('YouTube API returned no items:', JSON.stringify(data));
    return null;
  }
  const snippet = data.items[0].snippet;
  return {
    title: snippet.title || '',
    description: snippet.description || ''
  };
}

export {
  proxyUrls,
  fetchTranscriptWithFallback,
  fetchTranscriptFromCloudflare,
  formatTranscript,
  fetchYoutubeInfo
}; 