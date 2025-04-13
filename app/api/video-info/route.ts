import { NextResponse } from 'next/server';
import axios from 'axios';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('id');

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos`,
      {
        params: {
          id: videoId,
          part: 'snippet',
          key: process.env.YOUTUBE_API_KEY,
        },
      }
    );

    const videoData = response.data.items[0]?.snippet;
    if (!videoData) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        title: videoData.title,
        description: videoData.description,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error fetching video info:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch video information' },
      { status: 500, headers: corsHeaders }
    );
  }
} 