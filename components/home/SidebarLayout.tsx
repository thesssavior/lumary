'use client';

import React, { createContext, useContext, useState } from 'react';
import Sidebar from './Sidebar';
import SubscriptionPlans from './SubscriptionPlans';

export interface FolderType {
  id: string;
  name: string;
}

interface FolderContextType {
  activeFolder: FolderType | null;
  setActiveFolder: (folder: FolderType | null) => void;
  openSubscriptionModal: () => void;
}

export const FolderContext = createContext<FolderContextType>({
  activeFolder: null,
  setActiveFolder: () => {},
  openSubscriptionModal: () => {},
});

export const useFolder = () => useContext(FolderContext);

// Context to allow children to trigger sidebar refresh
export const SidebarRefreshContext = createContext<() => void>(() => {});

export default function SidebarLayout({ children }: { children: React.ReactNode }) {

  // open by default
  const [open, setOpen] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshSidebar = () => setRefreshKey(k => k + 1);

  const [activeFolder, setActiveFolder] = useState<FolderType | null>(null);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);

  const openSubscriptionModal = () => setIsPlansModalOpen(true);

  return (
    <FolderContext.Provider value={{ activeFolder, setActiveFolder, openSubscriptionModal }}>
      <SidebarRefreshContext.Provider value={refreshSidebar}>
        <div className="flex relative flex-1">
          <button
            onClick={() => setOpen((o) => !o)}
            className={`fixed top-3 ${open ? 'left-72' : 'left-4'} z-20 flex items-center justify-center w-10 h-10 text-gray-700 bg-gray-100 rounded focus:outline-none border border-gray-300`}
            aria-label="Toggle sidebar"
          >
            {open ? '×' : '☰'}
          </button>

          {/* Sidebar: open on desktop, toggled on mobile */}
          <aside
            className={`fixed inset-y-0 left-0 w-64 bg-white border-r z-10 transform transition-transform duration-200
              ${open ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <Sidebar refreshKey={refreshKey} />
          </aside>

          {/* Main content */}
          <main className="flex-1">
            {children}
          </main>

          <SubscriptionPlans isOpen={isPlansModalOpen} onCloseAction={() => setIsPlansModalOpen(false)} />
        </div>
      </SidebarRefreshContext.Provider>
    </FolderContext.Provider>
  );
} 