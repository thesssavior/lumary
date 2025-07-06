import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.trim().length === 0) {
      return NextResponse.json({ folders: [], summaries: [] });
    }

    const searchTerm = `%${query.trim()}%`;

    // Search folders
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, created_at')
      .eq('user_id', session.user.id)
      .ilike('name', searchTerm)
      .order('created_at', { ascending: false });

    if (foldersError) {
      console.error('Folders search error:', foldersError);
    }

    // Search summaries by name, summary content, and description (excluding transcript for efficiency)
    const { data: summaries, error: summariesError } = await supabase
      .from('summaries')
      .select('id, name, summary, description, video_id, folder_id, created_at')
      .eq('user_id', session.user.id)
      .or(`name.ilike.${searchTerm},summary.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .order('created_at', { ascending: false })
      .limit(50); // Limit results to prevent overwhelming the UI

    if (summariesError) {
      console.error('Summaries search error:', summariesError);
    }

    return NextResponse.json({
      folders: folders || [],
      summaries: summaries || [],
      query: query.trim()
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic'; 