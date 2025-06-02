"use client";

import { SessionProvider } from "next-auth/react";
import { useState, useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <SessionProvider>
      <div suppressHydrationWarning={true}>
        {children}
      </div>
    </SessionProvider>
  );
} 