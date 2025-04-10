import { VideoSummary } from "@/components/video-summary";
import { useTranslations } from 'next-intl';

export default function Home() {
  const t = useTranslations();
  
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-950 text-white">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-4xl font-bold text-center mb-2">
          {t('title')}
        </h1>
        <p className="text-zinc-400 text-center mb-12">
          {t('subtitle')}
        </p>
        <VideoSummary />
      </div>
    </main>
  );
} 