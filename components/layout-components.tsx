"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { LanguageSwitcher } from './language-switcher';

export function LayoutComponents() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Show scroll-to-top button when scrolled down
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 z-[100] p-2 rounded-full bg-black text-white shadow-lg hover:bg-zinc-800 transition-colors"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>
    </>
  );
} 