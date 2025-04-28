'use client'; 

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
// Re-import the components needed for the original page
import { VideoSummary } from "@/components/video-summary"; 
import { HomeHeader } from "@/components/home-header";
import { Suspense } from "react";

export default function Home() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const isDevMode = searchParams.get('dev') === 'true';
  // Get locale from params if needed, assuming default or context provides it
  // const locale = 'ko'; // Or get dynamically if needed

  if (isDevMode) {
    // Render the original page content for developers
    return (
      <main className="min-h-screen bg-white text-black">
        <div className="container mx-auto px-4 py-16 max-w-3xl">
          {/* Assuming HomeHeader doesn't need server-fetched locale anymore */}
          <HomeHeader locale={'ko'} /> 
          <Suspense fallback={<div>Loading...</div>}>
            <VideoSummary />
          </Suspense>
        </div>
      </main>
    );
  } else {
    // Render the maintenance message for regular users
    return (
      <main className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-3xl font-bold mb-4">서버 점검 중</h1>
          <p className="text-xl text-gray-600">죄송합니다 서둘러 고치겠습니다ㅠㅠ</p>
        </div>
      </main>
    );
  }
} 