'use client';

import { useSearch } from '@/contexts/SearchContext';
import SearchModal from './SearchModal';

export default function GlobalSearchModal() {
  const { isSearchModalOpen, closeSearchModal } = useSearch();

  return (
    <SearchModal 
      isOpen={isSearchModalOpen} 
      onClose={closeSearchModal} 
    />
  );
} 