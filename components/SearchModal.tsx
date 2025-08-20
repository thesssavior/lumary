'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X, Folder, FileText, Clock } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface SearchResult {
  folders: Array<{
    id: string;
    name: string;
    created_at: string;
  }>;
  summaries: Array<{
    id: string;
    name: string;
    summary: string;
    description: string;
    video_id: string;
    folder_id: string;
    created_at: string;
  }>;
  query: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ folders: [], summaries: [], query: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMac, setIsMac] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({ folders: [], summaries: [], query: '' });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
              const response = await fetch(`/api/home/search?q=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed. Please try again.');
      setResults({ folders: [], summaries: [], query: '' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect to trigger search when query changes with debouncing
  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (query.length > 0) {
      setIsLoading(true);
      // Set up new timeout
      timeoutRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults({ folders: [], summaries: [], query: '' });
      setIsLoading(false);
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, performSearch]);

  // Detect platform for keyboard shortcut display
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ folders: [], summaries: [], query: '' });
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleResultClick = () => {
    onClose();
  };

  if (!isOpen) return null;

  const hasResults = results.folders.length > 0 || results.summaries.length > 0;
  const showNoResults = query.length > 0 && !isLoading && !hasResults && !error;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
      <div className="bg-card text-card-foreground rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('SearchModal.placeholder', { defaultValue: 'Search summaries and folders...' })}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 outline-none text-lg bg-transparent"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded-full transition-colors"
            title="Close search"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="p-4 text-red-600 text-center">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="p-8 text-center text-muted-foreground">
              <div className="animate-spin w-6 h-6 border-2 border-border border-t-foreground rounded-full mx-auto mb-3"></div>
              {t('SearchModal.searching', { defaultValue: 'Searching...' })}
            </div>
          )}

          {showNoResults && (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-lg font-medium mb-1">
                {t('SearchModal.noResults', { defaultValue: 'No results found' })}
              </p>
              <p className="text-sm">
                {t('SearchModal.tryDifferent', { defaultValue: 'Try different keywords or check spelling' })}
              </p>
            </div>
          )}

          {hasResults && (
            <div className="p-4 space-y-6">
              {/* Folders */}
              {results.folders.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <Folder className="w-4 h-4" />
                    {t('SearchModal.folders', { defaultValue: 'Folders' })} ({results.folders.length})
                  </h3>
                  <div className="space-y-2">
                    {results.folders.map((folder) => (
                      <div
                        key={folder.id}
                        onClick={handleResultClick}
                        className="p-3 hover:bg-accent rounded-lg cursor-pointer border border-transparent hover:border-border transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-accent rounded-lg">
                            <Folder className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {folder.name}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Clock className="w-3 h-3" />
                              {new Date(folder.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summaries */}
              {results.summaries.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {t('SearchModal.summaries', { defaultValue: 'Summaries' })} ({results.summaries.length})
                  </h3>
                  <div className="space-y-2">
                    {results.summaries.map((summary) => (
                      <Link
                        key={summary.id}
                        href={`/${locale}/summaries/${summary.id}`}
                        onClick={handleResultClick}
                        className="block p-3 hover:bg-accent rounded-lg border border-transparent hover:border-border transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-accent rounded-lg flex-shrink-0 mt-1">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate mb-1">
                              {summary.name || summary.video_id}
                            </p>
                            {summary.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {summary.description}
                              </p>
                            )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {new Date(summary.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state when no query */}
          {query.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-lg font-medium mb-1">
                {t('SearchModal.startTyping', { defaultValue: 'Start typing to search' })}
              </p>
              <p className="text-sm">
                {t('SearchModal.searchDescription', { defaultValue: 'Search through your summaries and folders' })}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-muted px-4 py-3 text-xs text-muted-foreground text-center">
          <div className="flex items-center justify-center gap-4">
            <span>{t('SearchModal.tips', { defaultValue: 'Tip: Press Escape to close' })}</span>
            <span className="text-gray-400">•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-accent rounded text-foreground/80 font-mono text-xs">
                {isMac ? '⌘' : 'Ctrl'}
              </kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-accent rounded text-foreground/80 font-mono text-xs">
                K
              </kbd>
              <span className="ml-1">to search</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 