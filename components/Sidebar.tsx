'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Book, Search, Clock, Folder, ChevronDown, ChevronRight, User, Plus, LogOut, MoreHorizontal } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { useSession } from "next-auth/react";
import { useFolder } from './SidebarLayout';
import SubscriptionPlans from './SubscriptionPlans';

interface FolderType { id: string; name: string; }
interface SummaryType { id: string; video_id: string; summary: string; name: string; }

export default function Sidebar({ refreshKey }: { refreshKey?: number }) {
  const t = useTranslations();
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [folderSummaries, setFolderSummaries] = useState<{ [folderId: string]: SummaryType[] }>({});
  const [loadingSummaries, setLoadingSummaries] = useState<{ [folderId: string]: boolean }>({});
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [recentOpen, setRecentOpen] = useState(true);
  const [knowledgeOpen, setKnowledgeOpen] = useState(true);
  const [recents, setRecents] = useState<SummaryType[]>([]);
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const { data: session } = useSession();
  const { activeFolder, setActiveFolder } = useFolder();
  const [folderOpen, setFolderOpen] = useState<{ [folderId: string]: boolean }>({});
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);

  // Check session
  useEffect(() => {
    fetch('/api/auth/session').then(async (res) => {
      if (res.ok) {
        const session = await res.json();
        setIsSignedIn(!!session?.user);
      } else {
        setIsSignedIn(false);
      }
    });
  }, []);

  // Fetch folders
  const fetchFolders = async () => {
    setIsLoadingFolders(true);
    try {
      const res = await fetch('/api/folders');
      if (res.ok) {
        const data: FolderType[] = await res.json();
        setFolders(data);
        if (!activeFolder && data.length) {
          setActiveFolder(data[0]);
        } else if (data.length === 0) {
          setActiveFolder(null);
        }
      } else {
        console.error("Failed to fetch folders");
        setFolders([]);
        setActiveFolder(null);
      }
    } catch (error) {
      console.error("Error fetching folders:", error);
      setFolders([]);
      setActiveFolder(null);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  // Fetch summaries for active folder
  const fetchSummaries = async (folderId: string) => {
    setLoadingSummaries(prev => ({ ...prev, [folderId]: true }));
    try {
      const res = await fetch(`/api/folders/${folderId}/summaries`);
      if (res.ok) {
        const data = await res.json();
        setFolderSummaries(prev => ({ ...prev, [folderId]: data }));
      } else {
        setFolderSummaries(prev => ({ ...prev, [folderId]: [] }));
      }
    } catch (error) {
      setFolderSummaries(prev => ({ ...prev, [folderId]: [] }));
    } finally {
      setLoadingSummaries(prev => ({ ...prev, [folderId]: false }));
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      setIsLoadingFolders(true);
      fetchFolders();
    } else {
      setFolders([]);
      setActiveFolder(null);
      setFolderSummaries({});
      setLoadingSummaries({});
    }
  }, [isSignedIn, refreshKey]);

  useEffect(() => {
    if (activeFolder) {
      setFolderOpen({ [activeFolder.id]: true });
      // Fetch summaries for active folder if not already loaded
      if (!folderSummaries[activeFolder.id]) {
        fetchSummaries(activeFolder.id);
      }
    } else {
      setFolderOpen({});
    }
  }, [activeFolder, refreshKey]);

  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/folders/recent-summaries')
        .then(async (res) => {
          if (res.ok) {
            setRecents(await res.json());
          } else {
            setRecents([]);
          }
        })
        .catch(() => setRecents([]));
    } else {
      setRecents([]);
    }
  }, [isSignedIn, refreshKey]);

  // Folder operations
  const handleAddFolder = async () => {
    if (!newFolderName.trim()) return;
    const res = await fetch('/api/folders', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ name: newFolderName }) });
    if (res.ok) { setNewFolderName(''); setShowNewFolderInput(false); fetchFolders(); }
  };

  const handleRenameFolder = async (id: string) => {
    const name = prompt(t('Sidebar.renameFolder') || 'Rename folder');
    if (!name) return;
    await fetch(`/api/folders/${id}`, { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ name }) });
    fetchFolders();
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm(t('Sidebar.confirmDeleteFolder') || 'Delete folder?')) return;
    await fetch(`/api/folders/${id}`, { method: 'DELETE' });
    if (activeFolder?.id === id) setActiveFolder(null);
    fetchFolders();
  };

  // Drag-and-drop handlers
  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    // Folder reordering
    if (result.type === 'folder') {
      const reordered = Array.from(folders);
      const [removed] = reordered.splice(result.source.index, 1);
      reordered.splice(result.destination.index, 0, removed);
      setFolders(reordered);
      return;
    }
    // Summary moving across folders
    if (result.type === 'summary') {
      const sourceFolderId = result.source.droppableId;
      const destFolderId = result.destination.droppableId;
      if (sourceFolderId === destFolderId) return;
      const summaryIdx = result.source.index;
      // Find the summary in the current summaries list
      const summaryToMove = folderSummaries[sourceFolderId][summaryIdx];
      if (!summaryToMove) return;
      // Optimistically remove from current list
      setFolderSummaries(prev => ({
        ...prev,
        [sourceFolderId]: prev[sourceFolderId].filter((_, i) => i !== summaryIdx),
        [destFolderId]: [...prev[destFolderId], summaryToMove]
      }));
      // Call API to move summary
      await fetch(`/api/folders/${sourceFolderId}/summaries`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summaryId: summaryToMove.id, targetFolderId: destFolderId }),
      });
      // Refetch summaries for both folders
      if (activeFolder?.id === sourceFolderId) fetchSummaries(sourceFolderId);
      if (activeFolder?.id === destFolderId) fetchSummaries(destFolderId);
      // Optionally, you could optimistically add to dest folder if you keep all summaries in state
    }
  };

  // Example: Detect in-app browsers (client only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || navigator.vendor;
      if (/KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line|Daum|Whale|SamsungBrowser/i.test(ua)) {
        setInAppBrowser(true);
      }
    }
  }, []);

  // Helper to toggle folder open/close
  const toggleFolder = (folderId: string) => {
    setFolderOpen(prev => {
      const next = { ...prev, [folderId]: !prev[folderId] };
      // Only one open at a time if you want accordion style:
      // Object.keys(next).forEach(id => { if (id !== folderId) next[id] = false; });
      return next;
    });
    if (!folderOpen[folderId] && !folderSummaries[folderId]) {
      fetchSummaries(folderId);
    }
  };

  // UI: show login prompt if not signed in
  if (isSignedIn === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#f8fafc] p-6 text-center space-y-4">
        <User className="w-12 h-12 text-gray-400" />
        <p className="text-gray-700 text-lg font-medium">
          {t('signInDescription') || '로그인 후 이용 가능합니다'}
        </p>
        {inAppBrowser ? (
          <div className="bg-red-100 text-red-700 p-4 rounded-md text-base font-semibold">
            Google 로그인이 차단되었습니다. 크롬, 사파리 등 기본 브라우저로 열어주세요.
          </div>
        ) : (
          <button
            onClick={() => signIn('google')}
            className="px-4 py-2 bg-black hover:bg-zinc-800 text-white rounded-md"
          >
            {t('signIn') || '로그인하기'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-bold text-lg flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/lumary-logo.png" alt="Lumary Logo" width={100} height={100} />
          </Link>
        </span>
        <button
          className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium hover:bg-green-200"
          onClick={() => router.push(`/${locale}`)}
        >
          <Plus className="inline w-4 h-4 mr-1" /> 새로운 요약
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          <li>
            <Link href={`/${locale}/`}>
              <div className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 font-medium">
                <Book className="w-4 h-4" /> 홈
              </div>
            </Link>
          </li>
          <li>
            <a href="#" className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 font-medium">
              <Search className="w-4 h-4" /> 검색
            </a>
          </li>
          {/* Recent */}
          <li>
            <button
              className="flex items-center gap-2 w-full px-2 py-2 rounded hover:bg-gray-100 font-medium"
              onClick={() => setRecentOpen(o => !o)}
            >
              {recentOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              최근
            </button>
            {recentOpen && (
              <ul className="ml-6 mt-1 space-y-1">
                {recents.length === 0 && <li className="text-xs text-gray-400">최근 항목 없음</li>}
                {recents.map(r => (
                  <li key={r.id}>
                    <Link href={`/${locale}/summaries/${r.id}`} className="truncate text-sm text-gray-700 hover:underline cursor-pointer block">
                      {r.name || r.video_id}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
          {/* My Knowledge */}
          <li>
            <div className="flex items-center gap-2 w-full px-2 py-2 rounded hover:bg-gray-100 font-medium">
              <button
                className="flex items-center gap-2 w-full"
                onClick={() => setKnowledgeOpen(o => !o)}
                style={{ flex: 1 }}
              >
                {knowledgeOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                내 지식
              </button>
              <button
                className="ml-1 text-xs text-gray-400 hover:text-green-700"
                title="새 폴더 만들기"
                onClick={() => setShowNewFolderInput(true)}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {knowledgeOpen && (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="folders-droppable" type="folder">
                  {(provided) => (
                    <ul className="ml-6 mt-1 space-y-1" ref={provided.innerRef} {...provided.droppableProps}>
                      {folders.map((f, idx) => (
                        <Draggable key={f.id} draggableId={f.id} index={idx}>
                          {(dragProvided) => (
                            <li ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}>
                              <div className={`flex items-center gap-1 font-semibold text-gray-800 ${activeFolder?.id===f.id ? 'bg-gray-200 rounded px-1' : ''}`}
                                onClick={() => setActiveFolder(f)}
                              >
                                <button
                                  className="mr-1"
                                  onClick={e => { e.stopPropagation(); toggleFolder(f.id); }}
                                  aria-label={folderOpen[f.id] ? t('Sidebar.collapseFolder') || 'Collapse folder' : t('Sidebar.expandFolder') || 'Expand folder'}
                                >
                                  {folderOpen[f.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                <Folder className="w-4 h-4" />
                                <span className="mx-1 flex-1 text-left truncate">{f.name}</span>
                                <div className="relative ml-auto">
                                  <button
                                    className="text-xs text-gray-400 hover:text-gray-700"
                                    onClick={e => { e.stopPropagation(); setDropdownOpen(dropdownOpen === f.id ? null : f.id); }}
                                    aria-label={t('Sidebar.folderOptions') || 'Folder options'}
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                  {dropdownOpen === f.id && (
                                    <div className="absolute right-0 top-full mt-1 bg-white border rounded shadow-md py-1 w-28 min-w-[7rem] text-sm z-20">
                                      <button
                                        className="block w-full text-left px-2 py-2 hover:bg-gray-100"
                                        onClick={e => { e.stopPropagation(); setDropdownOpen(null); handleRenameFolder(f.id); }}
                                      >
                                        ✏️ {t('Sidebar.renameFolder') || 'Edit'}
                                      </button>
                                      <button
                                        className="block w-full text-left px-2 py-2 hover:bg-gray-100 text-red-600"
                                        onClick={e => { e.stopPropagation(); setDropdownOpen(null); handleDeleteFolder(f.id); }}
                                      >
                                        🗑️ {t('Sidebar.deleteFolder') || 'Delete'}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Summaries in folder: only show if expanded */}
                              {folderOpen[f.id] && (
                                <Droppable droppableId={f.id} type="summary">
                                  {(summaryProvided) => (
                                    <ul className="ml-5 mt-1 space-y-1" ref={summaryProvided.innerRef} {...summaryProvided.droppableProps}>
                                      {loadingSummaries[f.id] ? (
                                        <li className="text-xs text-gray-400">{t('Sidebar.loadingSummaries') || 'Loading summaries...'}</li>
                                      ) : folderSummaries[f.id]?.length === 0 ? (
                                        <li className="text-xs text-gray-400">{t('Sidebar.noSummaries') || 'No summaries'}</li>
                                      ) : (
                                        folderSummaries[f.id].map((s, sIdx) => (
                                          <Draggable key={s.id} draggableId={s.id} index={sIdx}>
                                            {(summaryDragProvided) => (
                                              <li ref={summaryDragProvided.innerRef} {...summaryDragProvided.draggableProps} {...summaryDragProvided.dragHandleProps} className="truncate text-sm text-gray-700 hover:underline cursor-pointer">
                                                <Link href={`/${locale}/summaries/${s.id}`}>{s.name}</Link>
                                              </li>
                                            )}
                                          </Draggable>
                                        ))
                                      )}
                                      {summaryProvided.placeholder}
                                    </ul>
                                  )}
                                </Droppable>
                              )}
                            </li>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {isLoadingFolders && (
                        <li className="ml-6 mt-1 space-y-1 text-xs text-gray-400">{t('Sidebar.loadingFolders') || '로딩중...'}</li>
                      )}
                      {/* Add folder input */}
                      {showNewFolderInput && (
                        <li className="flex items-center gap-1 bg-gray-200 rounded px-1 py-1 mt-2">
                          <span className="flex items-center">
                            <Folder className="w-4 h-4 text-gray-500 mr-1" />
                          </span>
                          <input
                            type="text"
                            className="flex-1 bg-transparent outline-none border-none text-sm px-1"
                            placeholder={t('Sidebar.newFolder')}
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleAddFolder(); }}
                            style={{ minWidth: 0 }}
                          />
                          <button
                            onClick={handleAddFolder}
                            className="px-1 py-1 bg-green-100 text-green-700 rounded text-xs shadow hover:bg-green-200 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
                            title="폴더 추가"
                          >
                            <Plus className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }}
                            className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs ml-1 hover:bg-gray-400 transition-colors duration-150"
                            title="취소"
                          >취소</button>
                        </li>
                      )}
                    </ul>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </li>
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t px-4 py-3 text-xs text-gray-500 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" /> {session?.user?.name}
          <span className={`ml-auto px-1.5 py-0.5 rounded text-xs font-medium ${session?.user?.plan && session?.user?.plan !== 'free' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {session?.user?.plan ? t(`Sidebar.plan_status_${session.user.plan}`) : t('Sidebar.plan_status_free')}
          </span>
        </div>
        <button
          onClick={() => setIsPlansModalOpen(true)}
          className="w-full bg-yellow-300 text-yellow-900 font-bold py-1 rounded mt-2 hover:bg-yellow-400 text-center block text-xs"
        >
          {t('Sidebar.upgrade')}
        </button>
      </div>

      <SubscriptionPlans isOpen={isPlansModalOpen} onClose={() => setIsPlansModalOpen(false)} />
    </div>
  );
} 