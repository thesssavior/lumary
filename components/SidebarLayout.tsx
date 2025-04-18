'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-full">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-10 h-10 min-w-[2.5rem] min-h-[2.5rem] flex items-center justify-center mr-2 text-gray-700 bg-gray-100 rounded focus:outline-none shadow-md z-20 mt-2 md:mt-4 md:hidden"
        aria-label="Toggle sidebar"
      >
        {open ? '×' : '☰'}
      </button>

      {/* Sidebar: open on desktop, toggled on mobile */}
      <aside
        className={`overflow-auto border-r transition-transform duration-200 bg-white z-10
          ${open ? 'translate-x-0' : '-translate-x-full'}
          fixed top-0 left-0 h-full w-64 md:static md:translate-x-0 md:w-64`}
        style={{ maxWidth: 256 }}
      >
        <Sidebar />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto ml-0 md:ml-0">
        {children}
      </main>
    </div>
  );
} 