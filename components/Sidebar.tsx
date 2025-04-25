'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Book, Search, Clock, Folder, ChevronDown, ChevronRight, User, Plus, LogOut } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { useSession } from "next-auth/react";
import { useFolder } from './SidebarLayout';

interface FolderType { id: string; name: string; }
interface SummaryType { id: string; video_id: string; summary: string; name: string; }

export default function Sidebar({ refreshKey }: { refreshKey?: number }) {
  const t = useTranslations();
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [summaries, setSummaries] = useState<SummaryType[]>([]);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [recentOpen, setRecentOpen] = useState(true);
  const [knowledgeOpen, setKnowledgeOpen] = useState(true);
  const [recents, setRecents] = useState<SummaryType[]>([]); // You can wire this up to your own logic
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const { data: session } = useSession();
  const { activeFolder, setActiveFolder } = useFolder();

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
    setIsLoadingSummaries(true);
    try {
      const res = await fetch(`/api/folders/${folderId}/summaries`);
      if (res.ok) {
        setSummaries(await res.json());
      } else {
        console.error("Failed to fetch summaries for folder:", folderId);
        setSummaries([]);
      }
    } catch (error) {
      console.error("Error fetching summaries:", error);
      setSummaries([]);
    } finally {
      setIsLoadingSummaries(false);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      setIsLoadingFolders(true);
      fetchFolders();
    } else {
      setFolders([]);
      setActiveFolder(null);
      setSummaries([]);
    }
  }, [isSignedIn, refreshKey]);
  useEffect(() => { if (activeFolder) fetchSummaries(activeFolder.id); }, [activeFolder, refreshKey]);

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
  const onDragEnd = (result: DropResult) => {
    // For now, just reorder folders locally. You can wire this up to persist order in Supabase.
    if (!result.destination) return;
    if (result.type === 'folder') {
      const reordered = Array.from(folders);
      const [removed] = reordered.splice(result.source.index, 1);
      reordered.splice(result.destination.index, 0, removed);
      setFolders(reordered);
    }
    // You can add summary drag-and-drop logic here
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
                  <li key={r.id} className="truncate text-sm text-gray-700 hover:underline cursor-pointer">{r.summary || r.video_id}</li>
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
                                onClick={() => {
                                  if (activeFolder?.id !== f.id) {
                                    setActiveFolder(f);
                                  }
                                }}
                              >
                                <Folder className="w-4 h-4" /> {f.name}
                                <button onClick={e => { e.stopPropagation(); handleRenameFolder(f.id); }} className="ml-1 text-xs text-gray-400 hover:text-gray-700">✏️</button>
                                <button onClick={e => { e.stopPropagation(); handleDeleteFolder(f.id); }} className="ml-1 text-xs text-gray-400 hover:text-red-600">🗑️</button>
                              </div>
                              {/* Summaries in folder */}
                              {activeFolder?.id === f.id && (
                                <ul className="ml-5 mt-1 space-y-1">
                                  {isLoadingSummaries ? (
                                    <li className="text-xs text-gray-400">{t('Sidebar.loadingSummaries') || '로딩중...'}</li>
                                  ) : summaries.length === 0 ? (
                                    <li className="text-xs text-gray-400">요약 없음</li>
                                  ) : (
                                    summaries.map(s => (
                                      <li key={s.id} className="truncate text-sm text-gray-700 hover:underline cursor-pointer">
                                        <Link href={`/${locale}/summaries/${s.id}`}>{s.name}</Link>
                                      </li>
                                    ))
                                  )}
                                </ul>
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
          <User className="w-4 h-4" /> {session?.user?.name} <span className="ml-auto text-green-600">무료</span>
        </div>
        <button className="w-full bg-yellow-300 text-yellow-900 font-bold py-1 rounded mt-2 hover:bg-yellow-400">업그레이드</button>
      </div>
    </div>
  );
} 