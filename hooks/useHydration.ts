import { useEffect, useState } from 'react';

/**
 * Custom hook to handle hydration state
 * Returns true when the component has hydrated on the client
 * Use this to prevent hydration mismatches when accessing browser APIs
 */
export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
} 