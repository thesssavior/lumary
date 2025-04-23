import { NextRequest, NextResponse } from 'next/server';

// Define the expected structure of the response data
// (Useful for clarity, though NextResponse.json handles serialization)
type ResponseData = {
  title?: string;
  error?: string;
};

export async function GET(request: NextRequest): Promise<NextResponse<ResponseData>> {
  // Get search parameters from the URL object
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY; // Access server-side env var

  if (!apiKey) {
    console.error("YouTube API Key not configured on the server.");
    // Don't expose the exact error to the client
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;

  try {
    const youtubeRes = await fetch(url);
    if (!youtubeRes.ok) {
      const errorText = await youtubeRes.text();
      console.error("Failed to fetch YouTube title from API:", youtubeRes.status, errorText);
      // Return a generic error to the client, forwarding the status code
      return NextResponse.json({ error: 'Failed to fetch video title' }, { status: youtubeRes.status });
    }
    const data = await youtubeRes.json();
    const title = data.items?.[0]?.snippet?.title ?? null;

    if (!title) {
        // Use 404 Not Found if the video exists but has no title (or item wasn't found)
        return NextResponse.json({ error: 'Video title not found' }, { status: 404 });
    }

    // Successfully found the title
    return NextResponse.json({ title }); // Status 200 is default
  } catch (error) {
    console.error("Internal error fetching YouTube title:", error);
    // Generic error for unexpected issues during fetch/processing
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// You can add other HTTP methods (POST, PUT, DELETE) here as needed
// export async function POST(request: NextRequest) { ... } 