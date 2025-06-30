import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabaseClient';

// GET /api/summaries/[summaryId]
export async function GET(request: Request, { params }: { params: Promise<{ summaryId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { summaryId } = await params;
    
    // Fetch summary with user validation
    const { data: summaryData, error: summaryError } = await supabase
      .from('summaries')
      .select('id, name, summary, video_id, created_at, folder_id, locale, content_language, transcript, mindmap, quiz, description')
      .eq('id', summaryId)
      .eq('user_id', session.user.id) // Ensure user owns this summary
      .single();

    if (summaryError || !summaryData) {
      return NextResponse.json({ error: 'Summary not found' }, { status: 404 });
    }

    // Fetch folder data
    const { data: folderData, error: folderError } = await supabase
      .from('folders')
      .select('id, name')
      .eq('id', summaryData.folder_id)
      .eq('user_id', session.user.id) // Ensure user owns this folder
      .single();

    if (folderError || !folderData) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({
      summary: summaryData,
      folder: folderData
    });

  } catch (error) {
    console.error('Unexpected error in summary API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 