import { createClient, SupabaseClient } from '@supabase/supabase-js';

// These should be set in your .env.local
const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Server-side client with service role key (for API routes)
const supabaseServiceRoleKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

// Client-side client with anon key (for client components)
const supabaseAnonKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabaseClient: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey); 