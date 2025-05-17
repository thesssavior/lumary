// Removed 'use client' - this is now a Server Component

// Keep necessary server-side imports if any (e.g., for fetching data unrelated to searchParams)
import HomePageContent from '@/components/home/HomePageContent';
import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';

// Revert PageProps to use Promise for params
interface PageProps {
  params: Promise<{ // Changed back to Promise
    locale: string;
  }>;
}

// Use async and await for params again
export default async function Home({ params }: PageProps) { 
  const resolvedParams = await params; // Await the params promise
  // const { locale } = resolvedParams; // Locale is available here if needed

  return (
    <main className=" bg-white text-black flex items-center justify-center">
      {/* Suspense boundary around the client component */}
      <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <HomePageContent /> 
      </Suspense>
    </main>
  );
} 