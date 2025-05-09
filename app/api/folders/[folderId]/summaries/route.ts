import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabaseClient';
import { calculateTokenCount } from '@/lib/utils';

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
    const { videoId, summary, title, input_token_count } = body;

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
        name: title,
        input_token_count: input_token_count,
        output_token_count: output_token_count,
        user_id: session.user.id
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