'use client';

import { useState, createContext } from 'react';
import Sidebar from './Sidebar';

// Context to allow children to trigger sidebar refresh
export const SidebarRefreshContext = createContext<() => void>(() => {});

export default function SidebarLayout({ children }: { children: React.ReactNode }) {

  
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshSidebar = () => setRefreshKey(k => k + 1);

  return (
    <SidebarRefreshContext.Provider value={refreshSidebar}>
      <div className="flex h-full relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className={`fixed top-24 ${open ? 'left-72' : 'left-4'} z-20 flex items-center justify-center w-10 h-10 text-gray-700 bg-gray-100 rounded focus:outline-none shadow-md`}
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
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarRefreshContext.Provider>
  );
} 