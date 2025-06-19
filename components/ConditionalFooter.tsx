'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function ConditionalFooter() {
  const pathname = usePathname();
  
  // Show footer only on home pages (e.g., /ko, /en, or just /)
  const isHomePage = pathname === '/' || pathname.match(/^\/[a-z]{2}$/) !== null;
  
  if (!isHomePage) {
    return null;
  }
  
  return <Footer />;
} 