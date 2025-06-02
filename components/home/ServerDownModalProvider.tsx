'use client';

import React, { useEffect } from 'react';
import ServerDownModal from './ServerDownModal';
import { useServerState } from '@/store/serverState';
import { useHydration } from '@/hooks/useHydration';

export default function ServerDownModalProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const { isServerDown, setServerDown } = useServerState();
  const isHydrated = useHydration();

  // Expose the error handler to window for global access - only after hydration
  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      // @ts-ignore - Adding a global handler
      window.showServerMaintenanceModal = () => {
        setServerDown(true);
      };
      
      return () => {
        // @ts-ignore - Cleanup
        window.showServerMaintenanceModal = undefined;
      };
    }
  }, [setServerDown, isHydrated]);

  return (
    <>
      {children}
      <ServerDownModal 
        open={isServerDown} 
        onClose={() => setServerDown(false)} 
      />
    </>
  );
} 