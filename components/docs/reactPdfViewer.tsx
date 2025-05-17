'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Use the official CDN for the worker - NOTE: use .mjs for v4.x
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ReactPdfViewerProps {
  // Only need the file now
  pdfFile: File;
}

// Basic styling for controls
const controlStyles = {
  padding: '8px 12px',
  margin: '0 5px',
  cursor: 'pointer',
  border: '1px solid #ccc',
  borderRadius: '4px',
  backgroundColor: '#f8f8f8',
};

const disabledControlStyles = {
  ...controlStyles,
  cursor: 'not-allowed',
  opacity: 0.5,
};

export default function ReactPdfViewer({ pdfFile }: ReactPdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setNumPages(null);
    setCurrentPageNumber(1); // Reset to first page on new file
    setZoomLevel(1.0); // Reset zoom
    const reader = new FileReader();

    reader.onload = (e) => {
      if (e.target?.result) {
        setPdfData(e.target.result as ArrayBuffer);
      } else {
        setError('Failed to read PDF file.');
      }
    };
    reader.onerror = () => {
      setError('Error reading PDF file.');
    };
    reader.readAsArrayBuffer(pdfFile);

  }, [pdfFile]);

  // Memoize the file object
  const fileObject = useMemo(() => (pdfData ? { data: pdfData } : null), [pdfData]);

  // Memoize the options object
  const options = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  }), []);

  const onDocumentLoadSuccess = useCallback(({ numPages: nextNumPages }: { numPages: number }) => {
    setNumPages(nextNumPages);
    // Ensure current page is valid if PDF changes
    setCurrentPageNumber(prev => Math.min(prev, nextNumPages));
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error('React-pdf document load error:', err);
    setError(`Failed to load document: ${err.message}.`);
  }, []);

  const goToPreviousPage = () => {
    setCurrentPageNumber(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPageNumber(prev => Math.min(prev + 1, numPages || 1));
  };

  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3.0)); // Max zoom 300%
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5)); // Min zoom 50%
  };

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: '5px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
       {/* Controls Section */}
      <div style={{ padding: '10px', borderBottom: '1px solid #ccc', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <button 
          onClick={goToPreviousPage} 
          disabled={currentPageNumber <= 1}
          style={currentPageNumber <= 1 ? disabledControlStyles : controlStyles}
          aria-label="Previous Page"
        >
          &lt;
        </button>
        <span style={{ margin: '0 5px' }}>
          Page {currentPageNumber} of {numPages ?? '--'}
        </span>
        <button 
          onClick={goToNextPage} 
          disabled={!numPages || currentPageNumber >= numPages}
          style={!numPages || currentPageNumber >= numPages ? disabledControlStyles : controlStyles}
          aria-label="Next Page"
        >
          &gt;
        </button>
        <div style={{ marginLeft: '20px', display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={zoomOut} 
            disabled={zoomLevel <= 0.5}
            style={zoomLevel <= 0.5 ? disabledControlStyles : { ...controlStyles, padding: '5px 10px' }}
            aria-label="Zoom Out"
          >
            -
          </button>
          <span style={{ margin: '0 10px', minWidth: '40px', textAlign: 'center' }}>{Math.round(zoomLevel * 100)}%</span>
          <button 
            onClick={zoomIn} 
            disabled={zoomLevel >= 3.0}
            style={zoomLevel >= 3.0 ? disabledControlStyles : { ...controlStyles, padding: '5px 10px' }}
            aria-label="Zoom In"
          >
            +
          </button>
        </div>
      </div>

      {/* PDF Display Section */}
      <div style={{ padding: '10px', width: '100%', maxHeight: 'calc(100vh - 150px)', overflow: 'auto' }}>
        {error && <p style={{ color: 'red', textAlign: 'center' }}>Error: {error}</p>}
        {!error && fileObject && (
          <div style={{ display: 'flex', justifyContent: 'center' }}> {/* Center the page */} 
            <Document
              file={fileObject}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              options={options}
              loading={<p style={{ textAlign: 'center' }}>Loading document...</p>}
              error={<p style={{ textAlign: 'center', color: 'red' }}>Failed to load PDF document.</p>}
            >
              <Page
                pageNumber={currentPageNumber}
                scale={zoomLevel} 
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={<p style={{ textAlign: 'center' }}>Loading page {currentPageNumber}...</p>}
              />
            </Document>
          </div>
        )}
        {!fileObject && !error && <p style={{ textAlign: 'center' }}>Loading PDF...</p>}
      </div>
    </div>
  );
} 