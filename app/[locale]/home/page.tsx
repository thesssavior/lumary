// app/page.tsx
'use client';

import { useState } from 'react';
import { PdfUploader } from '@/components/pdfUploader';
import { PdfPageSelector } from '@/components/pdfPageSelector';
import { PdfRenderer } from '@/components/pdfRenderer';

export default function Home() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: '20px', textAlign: 'center' }}>PDF Page Renderer</h1>
      <div style={{ marginBottom: '20px' }}>
        <PdfUploader onPdfLoad={setPdfFile} />
      </div>
      {pdfFile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <PdfPageSelector pdfFile={pdfFile} onPagesSelected={setSelectedPages} />
          <PdfRenderer pdfFile={pdfFile} selectedPages={selectedPages} />
        </div>
      )}
    </div>
  );
}