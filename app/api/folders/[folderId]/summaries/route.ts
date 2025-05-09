import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabaseClient';
import { calculateTokenCount } from '@/lib/utils';

const fetchYoutubeTitle = async (videoId: string) => {
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
  return data.items[0].snippet.title;
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
    const { videoId, video_title, summary, input_token_count, fetcher } = body;

    if (!videoId || !summary) {
      console.error('Missing required fields:', { videoId, summary });
      return NextResponse.json({ error: 'Missing videoId or summary' }, { status: 400 });
    }

    // Calculate token count of the summary text
    const output_token_count = calculateTokenCount(summary);

    const { data: summaryData, error: summaryError } = await supabase
      .from('summaries')
      .insert({
        folder_id: folderId,
        video_id: videoId,
        summary: summary,
        name: video_title,
        input_token_count: input_token_count,
        output_token_count: output_token_count,
        user_id: session.user.id,
        fetcher: fetcher,
      })
      .select()
      .single();

    if (summaryError) {
      console.error('Summary creation error:', summaryError);
      return NextResponse.json({ error: summaryError.message }, { status: 500 });
    }
    // Return the saved summary data along with the token count
    return NextResponse.json({ ...summaryData, input_token_count, output_token_count });
  } catch (error) {
    console.error('Unexpected error in summaries API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
  // Fallback: should never reach here, but just in case
  return NextResponse.json({ error: 'No response generated' }, { status: 500 });
}

// PATCH /api/folders/[folderId]/summaries
export async function PATCH(req: Request, { params }: { params: Promise<{ folderId: string }> }) {
  try {
    const { folderId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const { summaryId, targetFolderId } = body;
    if (!summaryId || !targetFolderId) {
      return NextResponse.json({ error: 'Missing summaryId or targetFolderId' }, { status: 400 });
    }
    // Update the summary's folder_id
    const { data: updated, error: updateError } = await supabase
      .from('summaries')
      .update({ folder_id: targetFolderId })
      .eq('id', summaryId)
      .select()
      .single();
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error moving summary:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 