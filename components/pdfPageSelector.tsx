// components/PdfPageSelector.tsx
'use client';

import { useEffect, useState } from 'react';

interface PdfPageSelectorProps {
  pdfFile: File | null;
  onPagesSelected: (pages: number[]) => void;
}

export function PdfPageSelector({ pdfFile, onPagesSelected }: PdfPageSelectorProps) {
  const [totalPages, setTotalPages] = useState<number>(0);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);

  useEffect(() => {
    if (pdfFile) {
      const loadPdf = async () => {
        try {
          // Dynamically import pdfjs-dist
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.2.113/pdf.worker.min.mjs';

          const arrayBuffer = await pdfFile.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          setTotalPages(pdf.numPages);
        } catch (error) {
          console.error('Error loading PDF:', error);
          alert('Failed to load PDF.');
        }
      };
      loadPdf();
    }
  }, [pdfFile]);

  const handlePageToggle = (pageNum: number) => {
    setSelectedPages((prev) =>
      prev.includes(pageNum)
        ? prev.filter((p) => p !== pageNum)
        : [...prev, pageNum]
    );
  };

  useEffect(() => {
    onPagesSelected(selectedPages);
  }, [selectedPages, onPagesSelected]);

  return (
    <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '5px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Select Pages to Render</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <label 
            key={page} 
            style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: '5px', 
              padding: '5px 10px', 
              border: '1px solid #ddd', 
              borderRadius: '3px', 
              cursor: 'pointer'
            }}
          >
            <input
              type="checkbox"
              checked={selectedPages.includes(page)}
              onChange={() => handlePageToggle(page)}
              style={{ cursor: 'pointer' }}
            />
            Page {page}
          </label>
        ))}
      </div>
    </div>
  );
}
