'use client';

import React, { useEffect, useState, useContext } from 'react';
import { useTranslations } from 'next-intl';
import { Book, Search, Clock, Folder, ChevronDown, ChevronRight, User, Plus, LogOut, MoreHorizontal, Crown, Settings, Home, HelpCircle, Trash2, Pencil } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { signIn, signOut } from 'next-auth/react';
import Image from 'next/image';
import { useSession } from "next-auth/react";
import { useFolder, FolderContext } from '@/components/home/SidebarLayout';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';

interface FolderType { id: string; name: string; }
interface SummaryType { id: string; video_id: string; summary: string; name: string; }

// Helper to get initials from name
const getInitials = (name: string = '') => {
  return name
    .split(' ')
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

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
  const params = useParams();
  const locale = params.locale as string;
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const { data: session } = useSession();
  const { activeFolder, setActiveFolder, openSubscriptionModal } = useFolder();
  const [folderOpen, setFolderOpen] = useState<{ [folderId: string]: boolean }>({});
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [hoveredSummaryId, setHoveredSummaryId] = useState<string | null>(null);
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);

  // Check session on mount
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

  // Fetch folders using api/folders
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

  // Fetch summaries for active folder using api/folders/${folderId}/summaries
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

  // Fetch folders on signin, refreshKey
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

  // Fetch summaries for active folder on active folder change, refreshKey
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

  // Fetch recent summaries on signin, refreshKey
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

  const handleDeleteSummary = async (folderId: string, summaryId: string) => {
    if (!confirm(t('Sidebar.confirmDeleteSummary', { defaultValue: '파일을 삭제하시겠습니까?' }))) return;

    try {
      const res = await fetch(`/api/folders/${folderId}/summaries`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summaryId }),
      });

      if (res.ok) {
        // Optimistically update UI or refetch
        setFolderSummaries(prev => ({
          ...prev,
          [folderId]: prev[folderId]?.filter(s => s.id !== summaryId) || [],
        }));
      } else {
        const errorData = await res.json();
        console.error("Failed to delete summary:", errorData.error);
        alert(t('Sidebar.deleteSummaryError', { defaultValue: 'Failed to delete summary. Please try again.' }));
      }
    } catch (error) {
      console.error("Error deleting summary:", error);
      alert(t('Sidebar.deleteSummaryError', { defaultValue: 'An error occurred while deleting the summary.' }));
    }
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

  // warn kakaotalk in app browser users
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || navigator.vendor;
      if (/KAKAOTALK/i.test(ua)) {
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
      <div className="flex flex-col items-center justify-center px-4 py-6 border-b">
        <span className="w-full flex justify-center">
          <Link href="/" className="flex items-center w-full justify-center">
            <Image src="/lumary.png" alt="Lumary Logo" width={120} height={120} className="w-full h-auto max-w-[120px]" />
          </Link>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          <li>
            <Link href={`/${locale}/`}>
              <div className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 font-medium">
                <Home className="w-4 h-4" /> {t('Sidebar.home', { defaultValue: '홈' })}
              </div>
            </Link>
          </li>
          <li>
            <a href="#" className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 font-medium">
              <Search className="w-4 h-4" /> {t('Sidebar.search', { defaultValue: '검색' })}
            </a>
          </li>
          {/* Recent */}
          <li>
            <button
              className="flex items-center gap-2 w-full px-2 py-2 rounded hover:bg-gray-100 font-medium"
              onClick={() => setRecentOpen(o => !o)}
            >
              {recentOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              {t('Sidebar.recent', { defaultValue: '최근' })}
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
                {t('Sidebar.myKnowledge', { defaultValue: '내 지식' })}
              </button>
              <button
                className="ml-1 text-xs text-gray-400 hover:text-black"
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
                              <div className={`flex items-center gap-1 font-semibold text-gray-800 group ${activeFolder?.id===f.id ? 'bg-gray-200 rounded px-1' : 'px-1'}`}
                                onClick={() => setActiveFolder(f)}
                                onMouseEnter={() => setHoveredFolderId(f.id)}
                                onMouseLeave={() => setHoveredFolderId(null)}
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
                                {hoveredFolderId === f.id && (
                                  <div className="flex items-center ml-auto">
                                    <button
                                      onClick={e => { e.stopPropagation(); handleRenameFolder(f.id); }}
                                      className="p-1 text-gray-500 hover:text-gray-700"
                                      title={t('Sidebar.renameFolder') || 'Rename folder'}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={e => { e.stopPropagation(); handleDeleteFolder(f.id); }}
                                      className="p-1 text-gray-500 hover:text-red-500"
                                      title={t('Sidebar.deleteFolder') || 'Delete folder'}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
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
                                              <li 
                                                ref={summaryDragProvided.innerRef} 
                                                {...summaryDragProvided.draggableProps} 
                                                {...summaryDragProvided.dragHandleProps} 
                                                className="flex items-center justify-between text-sm text-gray-700 hover:bg-gray-100 rounded group"
                                                onMouseEnter={() => setHoveredSummaryId(s.id)}
                                                onMouseLeave={() => setHoveredSummaryId(null)}
                                              >
                                                <Link href={`/${locale}/summaries/${s.id}`} className="truncate flex-grow px-1 hover:underline cursor-pointer block">
                                                  {s.name}
                                                </Link>
                                                {hoveredSummaryId === s.id && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation(); // Prevent navigation
                                                      handleDeleteSummary(f.id, s.id);
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title={t('Sidebar.deleteSummary', { defaultValue: 'Delete summary' })}
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                )}
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
                            className="px-1 py-1 bg-gray-300 text-black rounded text-xs shadow hover:bg-zinc-800 hover:text-white transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
                            title="폴더 추가"
                          >
                            <Plus className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }}
                            className="px-1 py-1 bg-gray-300 text-black rounded text-xs hover:bg-zinc-800 hover:text-white transition-colors duration-150"
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

      <div className="px-4 space-y-3 border-t text-center">
        <Link href="/community">
          <Button 
            variant="ghost" 
          title={t('helpAndCommunity')}
          >
            <span className="sm:hidden"><HelpCircle className="h-5 w-5" /></span>
            <span className="hidden sm:flex items-center space-x-2 gap-x-1">
              {t('helpAndCommunity')}
              <HelpCircle className="h-5 w-5" />
            </span>
          </Button>
        </Link>
      </div>

      {/* --- Footer Area Redesign --- */}
      <div className="px-4 py-3 space-y-3 border-t">
        {/* Upgrade Section */}
        {session?.user?.plan === 'premium' ? (
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Crown className="w-5 h-5 text-green-600" />
              <p className="text-sm font-semibold text-green-700">{t('Sidebar.premiumActive')}</p>
            </div>
            <p className="text-xs text-green-500">{t('Sidebar.premiumActiveSubtitle')}</p>
          </div>
        ) : (
          <div 
            className="bg-gray-100 p-4 rounded-lg text-center cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={openSubscriptionModal}
          >
            <button
              className="w-full bg-gray-900 text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-700 transition-colors duration-200 text-sm flex items-center justify-center gap-2 mb-2"
            >
              <Crown className="w-4 h-4" />
              {t('Sidebar.upgrade')}
            </button>
            <p className="text-xs text-gray-600">{t('Sidebar.upgradeSubtitle')}</p>
          </div>
        )}

        {/* User Info Section */}
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
          <Avatar className="h-8 w-8">
            <AvatarImage src={session?.user?.image ?? undefined} alt={session?.user?.name ?? 'User'} />
            <AvatarFallback>{getInitials(session?.user?.name ?? '')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate text-gray-800">{session?.user?.name}</p>
            <p className="text-xs truncate text-gray-500">{session?.user?.email}</p>
          </div>
          <Link href="/settings" className="flex items-center">
            <button className="text-gray-400 hover:text-gray-700" title="Settings"> {/* Add functionality later */}
              <Settings className="w-5 h-5" />
            </button>
          </Link>
          {/* Add Sign Out Button Here? Or in a dropdown from Settings? */}
           <button onClick={() => signOut()} className="text-gray-400 hover:text-red-600" title="Sign Out">
             <LogOut className="w-5 h-5" />
           </button>
        </div>
      </div>
      {/* --- End Footer Area Redesign --- */}
    </div>
  );
} 