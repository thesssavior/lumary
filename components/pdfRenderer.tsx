// components/PdfRenderer.tsx
'use client';

import { useEffect, useRef } from 'react';

interface PdfRendererProps {
  pdfFile: File | null;
  selectedPages: number[];
}

export function PdfRenderer({ pdfFile, selectedPages }: PdfRendererProps) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    if (pdfFile && selectedPages.length > 0) {
      const renderPages = async () => {
        try {
          // Dynamically import pdfjs-dist
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.2.113/pdf.worker.min.mjs';

          const arrayBuffer = await pdfFile.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

          for (const pageNum of selectedPages) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });

            const canvas = canvasRefs.current[pageNum - 1];
            if (canvas) {
              const context = canvas.getContext('2d');
              if (context) {
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                  canvasContext: context,
                  viewport,
                }).promise;
              }
            }
          }
        } catch (error) {
          console.error('Error rendering pages:', error);
          alert('Failed to render pages.');
        }
      };
      renderPages();
    }
  }, [pdfFile, selectedPages]);

  return (
    <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '5px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Rendered Pages</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {selectedPages.length === 0 && <p>Select pages above to render them here.</p>}
        {selectedPages.map((pageNum) => (
          <div key={pageNum} style={{ borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Page {pageNum}</p>
            <canvas
              ref={(el) => { canvasRefs.current[pageNum - 1] = el; }}
              style={{ border: '1px solid black', maxWidth: '100%', height: 'auto' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

