import { createClient, SupabaseClient } from '@supabase/supabase-js';

// These should be set in your .env.local
const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize the Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey); 