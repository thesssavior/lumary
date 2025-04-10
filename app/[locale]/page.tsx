import { VideoSummary } from "@/components/video-summary";
import { HomeHeader } from "@/components/home-header";

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function Home({ params }: PageProps) {
  const resolvedParams = await params;
  const { locale } = resolvedParams;
  
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-950 text-white">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <HomeHeader locale={locale} />
        <VideoSummary />
      </div>
    </main>
  );
} 