import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  // Try to insert a test folder
  const { data, error } = await supabase
    .from('folders')
    .insert({ user_id: '123e4567-e89b-12d3-a456-426614174000', name: 'Test Folder' })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
} 