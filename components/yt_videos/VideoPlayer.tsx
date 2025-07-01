'use client';

interface VideoPlayerProps {
  videoId: string | null;
  title?: string;
}

export function VideoPlayer({ videoId, title }: VideoPlayerProps) {
  return (
    <div className="h-full bg-black overflow-hidden rounded-lg">
      {videoId ? (
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${videoId}`}
          title={title || "YouTube video player"}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full rounded-lg"
        />
      ) : (
        <div className="flex items-center justify-center h-full text-white">
          <p>No video available</p>
        </div>
      )}
    </div>
  );
} 