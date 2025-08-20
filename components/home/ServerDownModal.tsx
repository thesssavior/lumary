import React from 'react';
import { X } from 'lucide-react';

export default function ServerDownModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card text-card-foreground rounded-lg p-6 shadow-lg max-w-md w-full mx-4 relative">
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        >
          <X size={20} />
        </button>
        
        <div className="text-center pt-2">
          <h2 className="text-xl font-bold mb-3">서버 점검 중</h2>
          <p className="mb-5">죄송합니다. 빨리 고치겠습니다.</p>
          <button
            className="px-4 py-2 bg-foreground hover:opacity-90 text-background rounded"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
} 