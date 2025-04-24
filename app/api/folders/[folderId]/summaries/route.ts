import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabaseClient';
import { cookies } from 'next/headers';
import { encoding_for_model, TiktokenModel } from '@dqbd/tiktoken';
import { Tiktoken } from "js-tiktoken/lite";
import o200k_base from "js-tiktoken/ranks/o200k_base";

// Fetch YouTube video title using YouTube Data API v3
async function fetchYoutubeTitle(videoId: string): Promise<string | null> {
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
  return data.items[0].snippet.title ?? null;
}

// Function to calculate token count for a given text
function calculateTokenCount(text: string) {
  const encoder = new Tiktoken(o200k_base);
  const tokens = encoder.encode(text);
  return tokens.length;
}

// GET /api/folders/[folderId]/summaries
export async function GET(request: Request, { params }: { params: Promise<{ folderId: string }> }) {
  try {
    const { folderId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data, error } = await supabase
      .from('summaries')
      .select('id, folder_id, video_id, summary, created_at, name')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Fetch summaries error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch summaries' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error in summaries API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/folders/[folderId]/summaries
export async function POST(req: Request, { params }: { params: Promise<{ folderId: string }> }) {
  try {
    const { folderId } = await params;
    console.log('Folder ID:', folderId);

    const session = await auth();
    
    if (!session?.user) {
      console.log('No session found in summaries API');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First verify the folder belongs to the user
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id')
      .eq('id', folderId)
      .eq('user_id', session.user.id)
      .single();

    if (folderError) {
      console.error('Folder verification error:', folderError);
      return NextResponse.json({ error: 'Folder not found or unauthorized' }, { status: 403 });
    }
    const body = await req.json();
    const { videoId, summary } = body;

    if (!videoId || !summary) {
      console.error('Missing required fields:', { videoId, summary });
      return NextResponse.json({ error: 'Missing videoId or summary' }, { status: 400 });
    }

    // Calculate token count of the summary text
    const tokenCount = calculateTokenCount(summary);

    // Fetch the YouTube title server-side
    let name = null;
    try {
      name = await fetchYoutubeTitle(videoId);
    } catch (e) {
      console.error('Failed to fetch YouTube title:', e);
    }

    const { data: summaryData, error: summaryError } = await supabase
      .from('summaries')
      .insert({
        folder_id: folderId,
        video_id: videoId,
        summary: summary,
        name: name,
        token_count: tokenCount
      })
      .select()
      .single();

    if (summaryError) {
      console.error('Summary creation error:', summaryError);
      return NextResponse.json({ error: summaryError.message }, { status: 500 });
    }
    // Return the saved summary data along with the token count
    return NextResponse.json({ ...summaryData, tokenCount });
  } catch (error) {
    console.error('Unexpected error in summaries API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
  // Fallback: should never reach here, but just in case
  return NextResponse.json({ error: 'No response generated' }, { status: 500 });
} 