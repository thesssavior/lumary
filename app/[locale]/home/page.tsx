// app/page.tsx
'use client';

import { useState } from 'react';
import { PdfUploader } from '@/components/pdfUploader';
import dynamic from 'next/dynamic';

// Dynamically import the ReactPdfViewer to avoid SSR issues with canvas
const ReactPdfViewer = dynamic(() => import('@/components/reactPdfViewer'), { ssr: false });

export default function Home() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const handlePdfLoad = (file: File | null) => {
    setPdfFile(file);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: '20px', textAlign: 'center' }}>PDF Viewer</h1>
      <div style={{ marginBottom: '20px' }}>
        <PdfUploader onPdfLoad={handlePdfLoad} />
      </div>
      {pdfFile && (
        <div style={{ marginTop: '30px' }}>
          <ReactPdfViewer pdfFile={pdfFile} />
        </div>
      )}
    </div>
  );
}