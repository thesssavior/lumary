import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

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
    Return 1-3 top-level nodes plus their children.
    The deepest level of nodes (leaf nodes) for any branch should be limited to 3 items.
    Use emojis and concise labels (max 6 words)
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

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      },
    });

    const resultJsonString = response.text;

    if (!resultJsonString) {
      return NextResponse.json({ error: 'Failed to generate mind map from Gemini' }, { status: 500 });
    }

    try {
      const mindmapData = JSON.parse(resultJsonString);
      // Basic validation of the structure
      if (!mindmapData.nodes || !mindmapData.edges) {
        console.error("Gemini response missing nodes or edges:", mindmapData);
        return NextResponse.json({ error: 'Invalid mind map structure from Gemini' }, { status: 500 });
      }
      return NextResponse.json(mindmapData, { status: 200 });
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError, "Raw response:", resultJsonString);
      return NextResponse.json({ error: 'Failed to parse mind map data from Gemini' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error generating mindmap:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
} 