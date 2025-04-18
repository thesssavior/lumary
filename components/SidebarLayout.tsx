'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-full relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="absolute top-4 left-4 z-20 flex items-center justify-center w-10 h-10 text-gray-700 bg-gray-100 rounded focus:outline-none shadow-md md:hidden"
        aria-label="Toggle sidebar"
      >
        {open ? '×' : '☰'}
      </button>

      {/* Sidebar: open on desktop, toggled on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white border-r z-10 transform transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
          md:static md:translate-x-0`}
      >
        <Sidebar />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
} 