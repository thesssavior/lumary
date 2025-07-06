import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabaseClient';

// PATCH /api/summaries/[summaryId]/mindmap
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ summaryId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { summaryId } = await params;
    const { mindmap } = await req.json();

    if (!mindmap) {
      return NextResponse.json({ error: 'Mindmap data is required' }, { status: 400 });
    }

    // Validate mindmap data structure
    if (!mindmap.nodes || !mindmap.edges) {
      return NextResponse.json({ error: 'Mindmap data (nodes and edges) is required' }, { status: 400 });
    }

    // Update the summary with mindmap data, ensuring user owns the summary
    const { data, error } = await supabase
      .from('summaries')
      .update({ mindmap: mindmap })
      .eq('id', summaryId)
      .eq('user_id', session.user.id) // Ensure user owns this summary
      .select('id, video_id')
      .single();

    if (error) {
      console.error('Supabase error saving mindmap:', error);
      return NextResponse.json({ error: error.message || 'Failed to save mindmap data to database' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Summary not found or you do not have permission to update it' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Mindmap saved successfully', 
      summaryId: data.id, 
      videoId: data.video_id 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing request to save mindmap:', error);
    return NextResponse.json({ error: error.message || 'Internal server error while saving mindmap' }, { status: 500 });
  }
} 