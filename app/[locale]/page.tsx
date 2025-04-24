import { VideoSummary } from "@/components/video-summary";
import { HomeHeader } from "@/components/home-header";
import { Suspense } from "react";

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function Home({ params }: PageProps) {
  const resolvedParams = await params;
  const { locale } = resolvedParams;
  
  return (
    <main className="min-h-screen bg-white text-black">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <HomeHeader locale={locale} />
        <Suspense fallback={<div>Loading...</div>}>
          <VideoSummary />
        </Suspense>
      </div>
    </main>
  );
} 