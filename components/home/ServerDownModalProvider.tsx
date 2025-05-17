'use client';

import React, { useEffect } from 'react';
import ServerDownModal from './ServerDownModal';
import { useServerState } from '@/store/serverState';

export default function ServerDownModalProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const { isServerDown, setServerDown } = useServerState();
  
  // Function to be called when API errors occur
  const handleServerError = () => {
    setServerDown(true);
  };

  // Expose the error handler to window for global access
  useEffect(() => {
    // @ts-ignore - Adding a global handler
    window.showServerMaintenanceModal = () => {
      setServerDown(true);
    };
    
    return () => {
      // @ts-ignore - Cleanup
      window.showServerMaintenanceModal = undefined;
    };
  }, [setServerDown]);

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