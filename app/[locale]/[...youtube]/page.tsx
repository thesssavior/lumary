"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

interface YoutubeCatchAllPageProps {
  params: Promise<{ youtube: string[] }>;
}

export default function YoutubeCatchAllPage({ params }: YoutubeCatchAllPageProps) {
  const router = useRouter();
  const { youtube } = use(params);
  const youtubeUrl = youtube.join("/");
  console.log(youtubeUrl);
  // Extract video ID from the URL
  const match = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
  useEffect(() => {
    if (match && match[1]) {
      // Redirect to the ko summary page with videoId as a query param
      router.replace(`/ko/summaries?videoId=${match[1]}`);
    } else {
      router.replace("/ko");
    }
  }, [youtubeUrl]);
  return <div>Redirecting...</div>;
} 