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
    
    if (!session?.user?.id) {
      console.log('No session user ID found in summaries API');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const {
      videoId,
      summary,
      title,
      name,
      input_token_count,
      transcript,
      description,
      locale,
      fetcher
    } = body;

    if (!videoId || !summary || !(title || name)) {
      console.error('Missing required fields:', { videoId, summary, title, name });
      return NextResponse.json({ error: 'Missing videoId, summary, or title/name' }, { status: 400 });
    }

    const output_token_count = calculateTokenCount(summary);

    const insertData = {
      folder_id: folderId,
      user_id: session.user.id,
      video_id: videoId,
      summary: summary,
      name: name || title,
      input_token_count: input_token_count,
      output_token_count: output_token_count,
      transcript: transcript,
      description: description,
      locale: locale,
      fetcher: fetcher
    };

    const { data: summaryData, error: summaryError } = await supabase
      .from('summaries')
      .insert(insertData)
      .select()
      .single();

    if (summaryError) {
      console.error('Summary creation error:', summaryError.message, summaryError.details);
      return NextResponse.json({ error: `Failed to save summary: ${summaryError.message}` }, { status: 500 });
    }
    
    return NextResponse.json(summaryData);

  } catch (error: any) {
    console.error('Unexpected error in POST /api/folders/[folderId]/summaries:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
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