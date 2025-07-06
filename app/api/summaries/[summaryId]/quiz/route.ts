import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabaseClient';

// PATCH /api/summaries/[summaryId]/quiz
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ summaryId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { summaryId } = await params;
    const { quiz } = await req.json();

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz data is required' }, { status: 400 });
    }

    // Validate quiz data structure
    if (!Array.isArray(quiz) || !quiz.every(item => typeof item.question === 'string' && typeof item.answer === 'string')) {
      return NextResponse.json({ error: 'Valid quiz data (array of question/answer objects) is required' }, { status: 400 });
    }

    // Update the summary with quiz data, ensuring user owns the summary
    const { data, error } = await supabase
      .from('summaries')
      .update({ quiz: quiz })
      .eq('id', summaryId)
      .eq('user_id', session.user.id) // Ensure user owns this summary
      .select('id, video_id')
      .single();

    if (error) {
      console.error('Supabase error saving quiz:', error);
      return NextResponse.json({ error: error.message || 'Failed to save quiz data to database' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Summary not found or you do not have permission to update it' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Quiz saved successfully', 
      summaryId: data.id, 
      videoId: data.video_id 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing request to save quiz:', error);
    return NextResponse.json({ error: error.message || 'Internal server error while saving quiz' }, { status: 500 });
  }
} 