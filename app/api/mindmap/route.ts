import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import OpenAI from 'openai';

const model = "gpt-4.1-mini";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { summaryText, locale } = await req.json();

    if (!summaryText) {
      return NextResponse.json({ error: 'Summary text is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const system = `
    You are an API that returns **only** valid JSON for a React-Flow mind-map.
    Goal → Give learners a concise, birds-eye structure of the content so they can comprehend the main points at a glance.

    Return only valid JSON (no markdown).
    Schema: {
      "nodes": RFNode[],
      "edges": RFEdge[]
    }
    Each RFNode must have unique "id" and a "position".
    Each RFEdge must reference existing node ids.
    Return 1-3 top-level nodes plus their children.
    The deepest level of nodes (leaf nodes) for any branch should be limited to 3-4 items.
    Example:
    {"nodes":[{"id":"root","data":{"label":"Central"},"position":{"x":0,"y":0},"type":"input"}],"edges":[]}
    `;
    
    const prompt = `
      provide the mindmap in language of ${locale}

      Summary Text:
      --- --- --- --- ---
      ${summaryText}
      --- --- --- --- ---

      JSON Output:
    `;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }, // Ensure JSON output
      temperature: 0.3, // Lower temperature for more deterministic output
    });

    const resultJsonString = completion.choices[0]?.message?.content;

    if (!resultJsonString) {
      return NextResponse.json({ error: 'Failed to generate mind map from OpenAI' }, { status: 500 });
    }

    try {
      const mindmapData = JSON.parse(resultJsonString);
      // Basic validation of the structure
      if (!mindmapData.nodes || !mindmapData.edges) {
        console.error("OpenAI response missing nodes or edges:", mindmapData);
        return NextResponse.json({ error: 'Invalid mind map structure from OpenAI' }, { status: 500 });
      }
      return NextResponse.json(mindmapData, { status: 200 });
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", parseError, "Raw response:", resultJsonString);
      return NextResponse.json({ error: 'Failed to parse mind map data from OpenAI' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error generating mindmap:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
} 


export async function PUT(req: NextRequest) {
  try {
    const { summaryId, mindmap } = await req.json();

    if (!summaryId) {
      return NextResponse.json({ error: 'Summary ID is required' }, { status: 400 });
    }
    if (!mindmap || !mindmap.nodes || !mindmap.edges) {
      return NextResponse.json({ error: 'Mindmap data (nodes and edges) is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('summaries')
      .update({ mindmap: mindmap })
      .eq('id', summaryId)
      .select('id, video_id')
      .single();

    if (error) {
      console.error('Supabase error saving mindmap:', error);
      return NextResponse.json({ error: error.message || 'Failed to save mindmap data to database' }, { status: 500 });
    }

    if (!data) {
        return NextResponse.json({ error: 'Failed to update summary with the given videoId, or summary not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Mindmap saved successfully', videoId: data.video_id, summaryId: data.id }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing request to save mindmap:', error);
    return NextResponse.json({ error: error.message || 'Internal server error while saving mindmap' }, { status: 500 });
  }
} 