'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';

export function PageProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.done();
    // Cleanup function to ensure NProgress finishes if component unmounts during navigation
    return () => {
      NProgress.done();
    };
  }, [pathname, searchParams]);

  // You can add a useEffect hook here if you want to trigger NProgress.start()
  // based on specific events, but simply calling NProgress.done() on route
  // change completion is often enough, as the browser's native loading
  // indicator handles the 'start' part visually.
  // If you *do* want to trigger start manually, you'd need a way to detect
  // the *beginning* of a navigation, which is trickier with App Router hooks.
  // One way is to wrap Links or use a global state/context.

  return null; // This component doesn't render anything itself
} 