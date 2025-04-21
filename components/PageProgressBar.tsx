'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';

export function PageProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousPathRef = useRef(pathname + searchParams.toString());

  useEffect(() => {
    const currentPath = pathname + searchParams.toString();
    if (currentPath !== previousPathRef.current) {
      NProgress.start();
      previousPathRef.current = currentPath;
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  return null;
} 