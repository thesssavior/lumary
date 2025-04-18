'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex h-full">
      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-2 mr-2 text-gray-700 bg-gray-100 rounded focus:outline-none"
      >
        {open ? '×' : '☰'}
      </button>

      {open && (
        <aside className="w-100 overflow-auto border-r">
          <Sidebar />
        </aside>
      )}

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
} 