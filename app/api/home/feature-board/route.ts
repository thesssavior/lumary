import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Define the expected structure of a feature, matching the frontend type
type Status = "planned" | "in-progress" | "shipped" | "considering";

interface Feature {
  id: string;
  title: string;
  description: string;
  status: Status;
  votes: number;
  date: string | null;
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('feature_board')
      .select('*'); // Select all columns

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch features from the database.' }, { status: 500 });
    }

    const features: Feature[] = data || [];
    return NextResponse.json(features, { status: 200 });

  } catch (error: any) {
    console.error('API Route /api/home/feature-board GET error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred while fetching features.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { featureId } = body;

    if (!featureId || typeof featureId !== 'string') {
      return NextResponse.json({ error: 'Invalid featureId.' }, { status: 400 });
    }

    // Fetch the current number of votes
    const { data: featureData, error: fetchError } = await supabase
      .from('feature_board')
      .select('votes')
      .eq('id', featureId)
      .single();

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch feature data.' }, { status: 500 });
    }

    if (!featureData) {
      return NextResponse.json({ error: 'Feature not found.' }, { status: 404 });
    }

    const currentVotes = featureData.votes || 0;
    const newVotes = currentVotes + 1;

    // Update the votes count
    const { data: updateData, error: updateError } = await supabase
      .from('feature_board')
      .update({ votes: newVotes })
      .eq('id', featureId)
      .select('id, title, description, status, votes, date') // Select all fields to return the updated feature
      .single();

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return NextResponse.json({ error: 'Failed to update vote count.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updatedFeature: updateData }, { status: 200 });

  } catch (error: any) {
    console.error('API Route /api/home/feature-board POST error:', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
} 