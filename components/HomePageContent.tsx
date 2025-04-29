'use client';

import { useSearchParams, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { VideoSummary } from "@/components/video-summary";
import { HomeHeader } from "@/components/home-header";
import { Suspense } from "react";

export default function HomePageContent() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const params = useParams();
  const isDevMode = searchParams.get('dev') === 'true';
  const locale = params.locale as string || 'ko'; // Get locale from client-side params

  // if (isDevMode) {
  //   // Render the original page content for developers
  //   return (
  //     <div className="container mx-auto px-4 py-16 max-w-3xl">
  //       <HomeHeader locale={locale} />
  //       {/* Wrap VideoSummary in Suspense if it fetches data */}
  //       <Suspense fallback={<div>Loading Summary...</div>}>
  //         <VideoSummary />
  //       </Suspense>
  //     </div>
  //   );
  // } else {
  //   // Render the maintenance message for regular users
    return (
      <div className="text-center px-4">
        <h1 className="text-3xl font-bold mb-4">서버 점검 중</h1>
        <p className="text-xl text-gray-600">죄송합니다 서둘러 고치겠습니다ㅠㅠ</p>
        <p className="text-xl text-gray-600">lilys.ai 와 다른 웹사이트도 유튜브 요약 가능합니다</p>
        <p className="text-xl text-gray-600">https://lilys.ai</p>
      </div>
    );
  // }
} 