import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side environment variables
const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side client with service role key (for API routes only)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);