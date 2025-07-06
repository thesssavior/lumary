import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabaseClient';

// PATCH /api/summaries/[summaryId]/chapters
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ summaryId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { summaryId } = await params;
    const { chapters } = await req.json();

    if (!chapters) {
      return NextResponse.json({ error: 'Chapters data is required' }, { status: 400 });
    }

    // Validate chapters data structure
    if (Array.isArray(chapters)) {
      // If it's an array, validate each chapter has required fields
      const isValidArray = chapters.every(chapter => 
        chapter.start_time !== undefined && 
        chapter.heading && 
        chapter.summary && 
        chapter.keywords
      );
      if (!isValidArray) {
        return NextResponse.json({ error: 'Invalid chapters data: each chapter must have start_time, heading, summary, and keywords' }, { status: 400 });
      }
    } else if (typeof chapters === 'string') {
      // If it's a string, ensure it's not empty
      if (!chapters.trim()) {
        return NextResponse.json({ error: 'Chapters data cannot be empty' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Chapters data must be an array or string' }, { status: 400 });
    }

    // Update the summary with chapters data, ensuring user owns the summary
    const { data, error } = await supabase
      .from('summaries')
      .update({ chapters: chapters })
      .eq('id', summaryId)
      .eq('user_id', session.user.id) // Ensure user owns this summary
      .select('id, video_id')
      .single();

    if (error) {
      console.error('Supabase error saving chapters:', error);
      return NextResponse.json({ error: error.message || 'Failed to save chapters data to database' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Summary not found or you do not have permission to update it' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Chapters saved successfully', 
      summaryId: data.id, 
      videoId: data.video_id 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing request to save chapters:', error);
    return NextResponse.json({ error: error.message || 'Internal server error while saving chapters' }, { status: 500 });
  }
} 