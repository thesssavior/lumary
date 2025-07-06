import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabaseClient';
import { calculateTokenCount } from '@/lib/utils';

// GET /api/summaries/[summaryId]
export async function GET(req: NextRequest, { params }: { params: Promise<{ summaryId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { summaryId } = await params;

    // Fetch summary and folder data
    const { data: summaryData, error: summaryError } = await supabase
      .from('summaries')
      .select('*')
      .eq('id', summaryId)
      .eq('user_id', session.user.id)
      .single();

    if (summaryError) {
      console.error('Supabase error fetching summary:', summaryError);
      return NextResponse.json({ error: summaryError.message || 'Failed to fetch summary' }, { status: 500 });
    }

    if (!summaryData) {
      return NextResponse.json({ error: 'Summary not found or access denied' }, { status: 404 });
    }

    // Fetch folder data
    let folderData = null;
    if (summaryData.folder_id) {
      const { data: folder, error: folderError } = await supabase
        .from('folders')
        .select('id, name')
        .eq('id', summaryData.folder_id)
        .eq('user_id', session.user.id)
        .single();

      if (!folderError && folder) {
        folderData = folder;
      }
    }

    return NextResponse.json({
      summary: summaryData,
      folder: folderData
    });

  } catch (error: any) {
    console.error('Error fetching summary:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/summaries/[summaryId] - Create new summary with basic metadata
export async function POST(req: NextRequest, { params }: { params: Promise<{ summaryId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { summaryId } = await params;
    const { 
      folderId,
      videoId,
      title,
      transcript,
      description,
      locale,
      contentLanguage
    } = await req.json();

    if (!folderId || !videoId || !title) {
      return NextResponse.json({ error: 'Missing required fields: folderId, videoId, title' }, { status: 400 });
    }

    // Calculate input token count from transcript
    const input_token_count = transcript ? calculateTokenCount(transcript) : 0;

    const insertData = {
      id: summaryId,
      folder_id: folderId,
      user_id: session.user.id,
      video_id: videoId,
      name: title,
      transcript: transcript,
      description: description,
      locale: locale,
      content_language: contentLanguage,
      input_token_count: input_token_count,
    };

    const { data: summaryData, error: summaryError } = await supabase
      .from('summaries')
      .insert(insertData)
      .select()
      .single();

    if (summaryError) {
      console.error('Summary creation error:', summaryError.message, summaryError.details);
      return NextResponse.json({ error: `Failed to create summary: ${summaryError.message}` }, { status: 500 });
    }
    
    return NextResponse.json({
      message: 'Summary created successfully',
      ...summaryData
    });

  } catch (error: any) {
    console.error('Error creating summary:', error);
    return NextResponse.json({ error: error.message || 'Internal server error while creating summary' }, { status: 500 });
  }
}

// PATCH /api/summaries/[summaryId] - Update summary metadata
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ summaryId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { summaryId } = await params;
    const updateData = await req.json();

    // Remove any fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.user_id;
    delete updateData.created_at;

    const { data, error } = await supabase
      .from('summaries')
      .update(updateData)
      .eq('id', summaryId)
      .eq('user_id', session.user.id)
      .select('id, video_id, name')
      .single();

    if (error) {
      console.error('Supabase error updating summary:', error);
      return NextResponse.json({ error: error.message || 'Failed to update summary' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Summary not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Summary updated successfully', 
      ...data
    });

  } catch (error: any) {
    console.error('Error updating summary:', error);
    return NextResponse.json({ error: error.message || 'Internal server error while updating summary' }, { status: 500 });
  }
}

// DELETE /api/summaries/[summaryId]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ summaryId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { summaryId } = await params;

    const { error } = await supabase
      .from('summaries')
      .delete()
      .eq('id', summaryId)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Supabase error deleting summary:', error);
      return NextResponse.json({ error: error.message || 'Failed to delete summary' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Summary deleted successfully' });

  } catch (error: any) {
    console.error('Error deleting summary:', error);
    return NextResponse.json({ error: error.message || 'Internal server error while deleting summary' }, { status: 500 });
  }
} 