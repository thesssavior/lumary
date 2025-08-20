"use client";

import { ReactNode, useEffect, useState } from "react";
import { ThemeProvider } from "next-themes";

interface ClientProviderProps {
  children: ReactNode;
}

export function ClientProvider({ children }: ClientProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Ensure we're actually in the browser before setting hydrated
    if (typeof window !== 'undefined') {
      setIsHydrated(true);
    }
  }, []);

  // During SSR and before hydration, render with suppressed hydration warnings
  if (!isHydrated) {
    return <div suppressHydrationWarning>{children}</div>;
  }

  // After hydration, render normally
  return <>{children}</>;
}

// Keep the old Providers export for backwards compatibility but simplified
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClientProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </ClientProvider>
  );
} 