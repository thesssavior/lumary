"use client";

import { use, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface YoutubeCatchAllPageProps {
  params: Promise<{ youtube: string[]; locale: string }>;
}

export default function YoutubeCatchAllPage({ params }: YoutubeCatchAllPageProps) {
  const router = useRouter();
  const { youtube, locale } = use(params);
  const searchParams = useSearchParams();
  
  // Join path segments to form the base URL
  let youtubePath = youtube.join("/");
  let protocol = youtube[0];
  try {
    protocol = decodeURIComponent(protocol);
  } catch {}
  if (protocol === "https:" || protocol === "http:") {
    youtubePath = protocol + "//" + youtube.slice(1).filter(Boolean).join("/");
  }
  
  // Construct query string from searchParams
  const queryString = new URLSearchParams(searchParams as unknown as Record<string, string>).toString();
  
  // Combine path and query string to form the full URL
  const fullYoutubeUrl = queryString ? `${youtubePath}?${queryString}` : youtubePath;

  useEffect(() => {
    if (fullYoutubeUrl) {
      // Encode the full URL to safely pass it as a query parameter
      router.replace(`/${locale}?youtube=${encodeURIComponent(fullYoutubeUrl)}`);
    } else {
      router.replace(`/${locale}`);
    }
  }, [fullYoutubeUrl, locale]);

  return <div>Redirecting...</div>;
}