import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabaseClient';

// PATCH /api/summaries/[summaryId]/summarize2 - Update summary with generated content
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ summaryId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { summaryId } = await params;
    const { 
      summary,
    } = await req.json();

    if (!summary) {
      return NextResponse.json({ error: 'Summary content is required' }, { status: 400 });
    }

    // Update the summary with generated content, ensuring user owns the summary
    // output_token_count uses another method for gemini-2.5-flash
    const updateData: any = {
      summary: summary,
    };

    const { data, error } = await supabase
      .from('summaries')
      .update(updateData)
      .eq('id', summaryId)
      .eq('user_id', session.user.id) // Ensure user owns this summary
      .select('id, video_id, name')
      .single();

    if (error) {
      console.error('Supabase error saving summary:', error);
      return NextResponse.json({ error: error.message || 'Failed to save summary data to database' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Summary not found or you do not have permission to update it' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Summary saved successfully', 
      summaryId: data.id, 
      videoId: data.video_id,
      name: data.name
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing request to save summary:', error);
    return NextResponse.json({ error: error.message || 'Internal server error while saving summary' }, { status: 500 });
  }
}
