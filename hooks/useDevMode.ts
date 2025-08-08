'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export function useDevMode(): boolean {
  const [isDevMode, setIsDevMode] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const devParam = searchParams.get('dev');
    setIsDevMode(devParam === 'true');
  }, [searchParams]);

  return isDevMode;
}
