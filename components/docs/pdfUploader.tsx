// components/PdfUploader.tsx
'use client';

import { ChangeEvent } from 'react';

interface PdfUploaderProps {
  onPdfLoad: (file: File) => void;
}

export function PdfUploader({ onPdfLoad }: PdfUploaderProps) {
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile && uploadedFile.type === 'application/pdf') {
      onPdfLoad(uploadedFile);
    } else {
      alert('Please upload a valid PDF file.');
    }
  };

  return (
    <div style={{ border: '2px dashed #ccc', padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        style={{ display: 'block', margin: '0 auto' }}
      />
      <p style={{ marginTop: '10px', color: '#666' }}>Drag & drop a PDF file here, or click to select</p>
    </div>
  );
}

