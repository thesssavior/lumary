import { VideoSummary } from "@/components/video-summary";
import { HomeHeader } from "@/components/home-header";

interface CatchAllPageProps {
  params: {
    locale: string;
    slug: string[]; // e.g., ['https:', '', 'www.youtube.com', 'watch?v=VIDEO_ID']
  };
}

// Regex to extract YouTube video ID
const YOUTUBE_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/\n

function extractVideoIdFromSlug(slug: string[]): string | null {
  if (!slug || slug.length === 0) return null;

  // Reconstruct the potential URL path from the slug segments
  // Handle cases like ['https:', '', 'www...'] or ['https:', 'www...']
  const urlPath = decodeURIComponent(slug.join('/').replace(/^:\/?\/?/, '')); // Remove potential leading ://
  const fullUrl = `https://${urlPath}`; // Assume https if scheme is missing in slug join

  console.log("Attempting to extract Video ID from:", fullUrl);

  const match = fullUrl.match(YOUTUBE_REGEX);
  if (match && match[1]) {
    console.log("Extracted Video ID:", match[1]);
    return match[1];
  }

  console.log("No Video ID found in slug:", slug);
  return null;
}

export default function CatchAllPage({ params }: CatchAllPageProps) {
  const { locale, slug } = params;
  const videoId = extractVideoIdFromSlug(slug);
  const initialUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : "";

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <HomeHeader locale={locale} />
        {/* Pass the reconstructed URL to the component */}
        <VideoSummary initialUrl={initialUrl} />
      </div>
    </main>
  );
} 