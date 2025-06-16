'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SearchContextType {
  isSearchModalOpen: boolean;
  openSearchModal: () => void;
  closeSearchModal: () => void;
}

const SearchContext = createContext<SearchContextType>({
  isSearchModalOpen: false,
  openSearchModal: () => {},
  closeSearchModal: () => {},
});

export const useSearch = () => useContext(SearchContext);

export default function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const openSearchModal = () => setIsSearchModalOpen(true);
  const closeSearchModal = () => setIsSearchModalOpen(false);

  // Global keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openSearchModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <SearchContext.Provider
      value={{
        isSearchModalOpen,
        openSearchModal,
        closeSearchModal,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
} 