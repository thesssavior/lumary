import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return new Response(JSON.stringify({ error: 'Missing email' }), { status: 400 });
  const { data, error } = await supabase.from('users').select('plan').eq('email', email).single();
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ plan: data?.plan || 'free' }), { status: 200 });
} 