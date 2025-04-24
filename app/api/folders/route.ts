import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabaseClient';

// GET /api/folders - list user folders
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      console.log('No session found in /api/folders');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: folders, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Supabase folders fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If no folders exist, create a default one
    let foldersList = folders || [];
    if (foldersList.length === 0) {
      console.log('No folders found for user, creating default folder');
      const { data: defaultFolder, error: createErr } = await supabase
        .from('folders')
        .insert({ user_id: session.user.id, name: 'My Folder' })
        .select('*')
        .single();
      if (createErr) {
        console.error('Default folder creation error:', createErr);
      } else {
        foldersList = [defaultFolder];
      }
    }
    return NextResponse.json(foldersList);
  } catch (error) {
    console.error('Unexpected error in /api/folders:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/folders - create a new folder
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('folders')
    .insert({ user_id: session.user.id, name })
    .select('id,name,created_at')
    .single();
  if (error) {
    console.error('Create folder error:', error.message);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
} 