// hooked by thumbnail and title, unhooked in seconds
// 1. fetch youtube video info: title, thumbnail
// 2. fetch youtube transcript
// 3. feed title, thumbnail, transcript to openai api
// 4. explain title and thumbnail

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import axios from 'axios';
import { YoutubeTranscript } from 'youtube-transcript';
import { formatTime } from '@/lib/utils';
import { HttpsProxyAgent } from 'https-proxy-agent';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Bright Data proxy setup
const proxyUrl = 'http://brd-customer-hl_414d8129-zone-residential_proxy1:yd55dtlsq03w@brd.superproxy.io:33335';
const agent = new HttpsProxyAgent(proxyUrl);

export async function POST(request: Request) {
  try {
    const { videoId } = await request.json();

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // 1. Fetch YouTube video info
    const videoInfoResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos`,
      {
        params: {
          part: 'snippet',
          id: videoId,
          key: process.env.YOUTUBE_API_KEY,
        },
      }
    );

    const videoInfo = videoInfoResponse.data.items[0];
    if (!videoInfo) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    const { title, thumbnails } = videoInfo.snippet;
    const thumbnailUrl = thumbnails.maxres?.url || thumbnails.high?.url;

    // 2. Fetch transcript
    let transcriptText = '';
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        fetchOptions: { agent },
      } as any);

      transcriptText = transcript.map(item =>
        `[${formatTime(item.offset)}] ${item.text}`
      ).join('\n');
    } catch (error) {
      console.error('Error fetching transcript:', error);
      return NextResponse.json({ error: 'Failed to fetch transcript' }, { status: 400 });
    }

    // 3. Analyze with OpenAI
    const prompt = `Explain this YouTube video's title and thumbnail:

Title: "${title}"
Thumbnail URL: ${thumbnailUrl}
${transcriptText ? `\nTranscript excerpt: ${transcriptText.substring(0, 1000)}...` : ''}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that unhooks viewers from clickbait-style YouTube videos. Your job is to: - Explain how the title and thumbnail are designed to spark curiosity or raise a question. - Use the video transcript to directly and clearly answer the viewer's implicit or explicit question. - Quote exact phrases from the transcript with timestamps to support the answer. If you cant find the answer in the transcript, just say 'I cant find the answer, likely clickbait'. Keep your explanation brief, clear, and satisfying."
        },
        {
          role: "user",
          content: prompt
        }
      ],
    });

    const analysis = completion.choices[0].message.content;

    return NextResponse.json({
      title,
      thumbnailUrl,
      analysis,
    });

  } catch (error) {
    console.error('Error in unhook analysis:', error);
    return NextResponse.json(
      { error: 'Failed to analyze video' },
      { status: 500 }
    );
  }
}

