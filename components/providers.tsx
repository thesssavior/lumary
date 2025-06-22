"use client";

import { ReactNode, useEffect, useState } from "react";

interface ClientProviderProps {
  children: ReactNode;
}

export function ClientProvider({ children }: ClientProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return <div suppressHydrationWarning>{children}</div>;
  }

  return <>{children}</>;
}

// Keep the old Providers export for backwards compatibility but simplified
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClientProvider>
      {children}
    </ClientProvider>
  );
} 