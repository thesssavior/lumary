import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabaseClient';
 
const model = 'gpt-4.1-mini';

export async function POST(req: NextRequest) {
  try {
    const { summaryText, contentLanguage } = await req.json();

    if (!summaryText) {
      return NextResponse.json({ error: 'Summary text is required' }, { status: 400 });
    }

    // left to right. sometimes spits out radially, gotta fix
    const systemInstruction = `
    You are an API that returns **only** valid JSON for a React-Flow mind-map.
    Goal → Give learners a concise, birds-eye structure of the content so they can comprehend the main points at a glance.

    Return only valid JSON (no markdown).
    Schema: {
      "nodes": RFNode[],
      "edges": RFEdge[]
    }

    Each RFNode must have unique "id" and a "position".
    Each RFEdge must reference existing node ids.
    The deepest level of nodes (leaf nodes) for any branch should be limited to 3 items.
    Use emojis and concise labels (max 4 words)
    Maximum 16 total nodes (including root)
    Left to right layout: top node at the left, children to the right
    Example:
    {"nodes":[{"id":"root","data":{"label":"Central"},"position":{"x":0,"y":0},"type":"input"}],"edges":[]}
    `;
    
    const prompt = `
      IMPORTANT: Provide the mindmap in ${contentLanguage} language

      Summary Text:
      --- --- --- --- ---
      ${summaryText}
      --- --- --- --- ---

      JSON Output:
    `;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt },
      ],
    });

    const resultJsonString = completion.choices[0]?.message?.content || '';

    if (!resultJsonString) {
      return NextResponse.json({ error: 'Failed to generate mind map' }, { status: 500 });
    }

    try {
      const mindmapData = JSON.parse(resultJsonString);
      // Basic validation of the structure
      if (!mindmapData.nodes || !mindmapData.edges) {
        console.error("Mindmap response missing nodes or edges:", mindmapData);
        return NextResponse.json({ error: 'Invalid mind map structure' }, { status: 500 });
      }
      return NextResponse.json(mindmapData, { status: 200 });
    } catch (parseError) {
      console.error("Failed to parse mind map response:", parseError, "Raw response:", resultJsonString);
      return NextResponse.json({ error: 'Failed to parse mind map data' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error generating mindmap:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/summaries/mindmap
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { summaryId, mindmap } = await req.json();

    if (!summaryId) {
      return NextResponse.json({ error: 'Summary ID is required' }, { status: 400 });
    }

    if (!mindmap) {
      return NextResponse.json({ error: 'Mindmap data is required' }, { status: 400 });
    }

    // Validate mindmap data structure
    if (!mindmap.nodes || !mindmap.edges) {
      return NextResponse.json({ error: 'Mindmap data (nodes and edges) is required' }, { status: 400 });
    }

    // Update the summary with mindmap data, ensuring user owns the summary
    const { data, error } = await supabase
      .from('summaries')
      .update({ mindmap: mindmap })
      .eq('id', summaryId)
      .eq('user_id', session.user.id) // Ensure user owns this summary
      .select('id, video_id')
      .single();

    if (error) {
      console.error('Supabase error saving mindmap:', error);
      return NextResponse.json({ error: error.message || 'Failed to save mindmap data to database' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Summary not found or you do not have permission to update it' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Mindmap saved successfully', 
      summaryId: data.id, 
      videoId: data.video_id 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing request to save mindmap:', error);
    return NextResponse.json({ error: error.message || 'Internal server error while saving mindmap' }, { status: 500 });
  }
} 