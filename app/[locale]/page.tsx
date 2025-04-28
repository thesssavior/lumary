// Removed 'use client' - this is now a Server Component

// Keep necessary server-side imports if any (e.g., for fetching data unrelated to searchParams)
import { HomeHeader } from "@/components/home-header";
import { VideoSummary } from "@/components/video-summary";
import { Suspense } from "react";

// Original PageProps interface
interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}

// Revert to original async function and rendering
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