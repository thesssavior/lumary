'use client';

import { useSearchParams, useParams } from 'next/navigation';
import { HomeHeader } from "@/components/home/home-header";
import { Suspense } from "react";
import { VideoInputForm } from '@/components/yt_videos/VideoInputForm';
import { Loader2 } from 'lucide-react';

export default function HomePageContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params.locale as string || 'ko'; // Get locale from client-side params
  const isDevMode = searchParams.get('dev') === 'true';

  // if (isDevMode) {
  //   // Render the original page content for developers
    return (
        <div className="container mx-auto px-4 max-w-3xl mt-16">
          <HomeHeader locale={locale} />
          <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <VideoInputForm />
          </Suspense>
          {/* Pass videoIdFromUrl to FullTranscriptViewer */}
        </div>
    );
  // } else {
  //   // Render the maintenance message for regular users
  //   return (
  //     <div className="text-center px-4">
  //       <h1 className="text-3xl font-bold mb-4">서버 점검 중</h1>
  //       <p className="text-xl text-gray-600">죄송합니다 서둘러 고치겠습니다ㅠㅠ</p>
  //       <p className="text-xl text-gray-600">lilys.ai 와 다른 웹사이트도 유튜브 요약 가능합니다</p>
  //       <p className="text-xl text-gray-600">https://lilys.ai</p>
  //     </div>
  //   );
  // }
} 