// Removed 'use client' - this is now a Server Component

// Keep necessary server-side imports if any (e.g., for fetching data unrelated to searchParams)
import HomePageContent from '@/components/HomePageContent';
import { Suspense } from 'react';

// If you need params server-side for other things, keep this interface
interface PageProps {
  params: { // Changed from Promise to direct object for Server Components
    locale: string;
  };
}

export default function Home({ params }: PageProps) {
  // const { locale } = params; // Locale is available here if needed server-side

  return (
    <main className="min-h-screen bg-white text-black flex items-center justify-center">
      {/* Suspense boundary around the client component */}
      <Suspense fallback={<div>Loading Page...</div>}>
        <HomePageContent />
      </Suspense>
    </main>
  );
} 