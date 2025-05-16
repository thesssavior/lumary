import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { auth } from '@/auth';

export async function POST(req: Request) {
  try {
    // Get session to identify the user (optional)
    const session = await auth();
    const userId = session?.user?.id || null;

    // Parse request body
    const body = await req.json();
    const { content, email } = body;

    // Validate input
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Report content cannot be empty.' }, { status: 400 });
    }
    if (email && typeof email !== 'string') {
      return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
    }

    // Prepare data for Supabase
    const reportData: { content: string; user_id: string | null; email?: string } = {
      content: content.trim(),
      user_id: userId,
    };

    if (email) {
      reportData.email = email.trim();
    }

    // Insert into Supabase table
    const { data, error } = await supabase
      .from('user_reports') // Use the table name you created
      .insert([reportData])
      .select(); // Optionally select to confirm insertion

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Failed to save report.' }, { status: 500 });
    }

    // Success
    return NextResponse.json({ success: true, report: data?.[0] }, { status: 201 });

  } catch (error: any) {
    console.error('API Route error:', error);
    // Handle potential JSON parsing errors or other unexpected issues
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
} 