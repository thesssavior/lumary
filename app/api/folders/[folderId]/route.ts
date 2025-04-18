export const runtime = "nodejs";

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabaseClient';

// GET /api/folders/[folderId] - fetch a single folder
export async function GET(request: Request, { params }: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('folders')
    .select('id,name,created_at')
    .eq('id', folderId)
    .eq('user_id', session.user.id)
    .single();
  if (error) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  return NextResponse.json(data);
}

// PATCH /api/folders/[folderId] - rename a folder
export async function PATCH(request: Request, { params }: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await request.json();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('folders')
    .update({ name })
    .eq('id', folderId)
    .eq('user_id', session.user.id)
    .select('id,name,updated_at')
    .single();
  if (error) return NextResponse.json({ error: 'Failed to rename folder' }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/folders/[folderId] - delete a folder and its summaries
export async function DELETE(request: Request, { params }: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Remove all summaries in the folder
  await supabase.from('summaries').delete().eq('folder_id', folderId);
  // Delete the folder itself
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId)
    .eq('user_id', session.user.id);
  if (error) return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  return NextResponse.json({ success: true });
} 