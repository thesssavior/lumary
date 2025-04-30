"use client";

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import mammoth from 'mammoth';
import { Label } from "@/components/ui/label";
// Note: pptx2html might need specific setup or a different library if it causes issues.
// We'll placeholder the logic for now.
// import pptx2html from 'pptx2html';

// Setup PDF worker path (crucial for pdfjs-dist)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

// Helper function to parse page input string (e.g., "1-3, 5, 7-8")
const parsePageInput = (input: string, maxPage: number): number[] => {
  const pages = new Set<number>();
  const parts = input.split(',');

  for (const part of parts) {
    const trimmedPart = part.trim();
    if (trimmedPart.includes('-')) {
      const [startStr, endStr] = trimmedPart.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end) && start <= end && start >= 1 && end <= maxPage) {
        for (let i = start; i <= end; i++) {
          pages.add(i);
        }
      } else {
        throw new Error(`Invalid range: "${trimmedPart}"`);
      }
    } else {
      const page = parseInt(trimmedPart, 10);
      if (!isNaN(page) && page >= 1 && page <= maxPage) {
        pages.add(page);
      } else {
        throw new Error(`Invalid page number: "${trimmedPart}"`);
      }
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
};

export default function FileSummarizerPage() {
  const t = useTranslations('FileSummarizer');
  const locale = useLocale();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // State for page selection
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [showPageSelector, setShowPageSelector] = useState<boolean>(false);
  const [selectedPagesInput, setSelectedPagesInput] = useState<string>(''); // User input string

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
      // Reset everything when a new file is selected
      setExtractedText(null);
      setSummary('');
      setError(null);
      setShowPageSelector(false);
      setPdfDocument(null);
      setTotalPages(null);
      setSelectedPagesInput('');
    } else {
      setSelectedFile(null);
      setFileName('');
    }
  };

  // This function now might resolve with text OR trigger page selection
  const loadAndCheckFile = async (file: File): Promise<{ text?: string; needsPageSelection?: boolean }> => {
    const fileType = file.type;
    const reader = new FileReader();
    const MAX_PAGES_AUTO_EXTRACT = 10;

    return new Promise((resolve, reject) => {
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            reject(new Error(t('errorReadingFile')));
            return;
          }

          if (fileType === 'application/pdf') {
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            if (pdf.numPages > MAX_PAGES_AUTO_EXTRACT) {
              // Needs page selection
              setPdfDocument(pdf);
              setTotalPages(pdf.numPages);
              setShowPageSelector(true);
              resolve({ needsPageSelection: true }); // Signal that page selection is needed
            } else {
              // Extract all pages directly
              let textContent = '';
              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const text = await page.getTextContent();
                textContent += text.items.map((item: TextItem | any) => {
                  return 'str' in item ? item.str : '';
                }).join(' ');
                textContent += '\n';
              }
              resolve({ text: textContent }); // Resolve with extracted text
            }
          } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { // DOCX
            const result = await mammoth.extractRawText({ arrayBuffer });
            resolve({ text: result.value });
          } else if (fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') { // PPTX
             console.warn("PPTX extraction is not yet fully implemented client-side.");
             reject(new Error(t('pptxNotSupported')));
          } else {
            reject(new Error(t('unsupportedFileType')));
          }
        } catch (err) {
           console.error("Error loading/checking file:", err);
           let errorMessage = t('errorExtractingText');
           if (err instanceof Error) {
               errorMessage += `: ${err.message}`;
           }
           reject(new Error(errorMessage));
        }
      };

      reader.onerror = () => {
        reject(new Error(t('errorReadingFile')));
      };

      reader.readAsArrayBuffer(file);
    });
  };

  // Renamed: This now only starts the process or handles non-PDFs/small PDFs
  const handleInitialSummarize = async () => {
    if (!selectedFile) {
      setError(t('noFileSelected'));
      return;
    }

    // Reset previous results/state before loading
    setIsLoading(true);
    setError(null);
    setSummary('');
    setExtractedText(null);
    setShowPageSelector(false);
    setPdfDocument(null);
    setTotalPages(null);
    setSelectedPagesInput('');

    try {
      const result = await loadAndCheckFile(selectedFile);

      if (result.needsPageSelection) {
        // Page selector will be shown by loadAndCheckFile, just stop loading
        console.log(`PDF has ${totalPages} pages. Showing page selector.`);
        setIsLoading(false); // Stop loading indicator, wait for user input
        return; // Wait for user to select pages
      }

      if (result.text !== undefined) {
        const text = result.text;
        setExtractedText(text); // Display extracted text in the UI
        console.log("--- Extracted Text (<=10 pages or Non-PDF) ---");
        console.log(text);
        console.log(`--- End Extracted Text (${text.length} chars) ---`);

        if (!text.trim()) {
          throw new Error(t('errorNoTextExtracted'));
        }

        // --- Temporarily skip API call for testing extraction ---
        /*
        // 2. Call Backend API (TODO: Implement API call)
        const response = await fetch('/api/summarize-file', { // TODO: Create this API route
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ textContent: text, locale: locale }), // Send text and locale
        });

         if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || t('errorFromApi'));
        }

        // 3. Stream Response
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error(t('errorNoResponseStream'));
        }

        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          setSummary((prev) => prev + decoder.decode(value, { stream: true }));
        }
        */
        // --- End of temporarily skipped code ---
        console.log("Extraction test successful (API call skipped).");
      } else {
        // Should not happen if needsPageSelection is false and no error occurred
        throw new Error(t('errorUnknownState'));
      }

    } catch (err: any) {
      console.error("Initial processing error:", err);
      setError(err.message || t('errorUnknown'));
      setExtractedText(null);
    } finally {
      // Only set loading false here if we didn't enter page selection mode
      if (!showPageSelector) {
         setIsLoading(false);
      }
    }
  };

  // Function to handle extraction after user selects pages
  const handleExtractSelectedPages = async () => {
    if (!pdfDocument || !totalPages) {
      setError(t('errorPdfNotLoaded'));
      return;
    }
    if (!selectedPagesInput.trim()) {
      setError(t('errorNoPagesSelected'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractedText(null); // Clear previous potentially extracted text

    try {
      const pageNumbers = parsePageInput(selectedPagesInput, totalPages);
      if (pageNumbers.length === 0) {
        throw new Error(t('errorNoValidPages'));
      }

      console.log("Extracting selected pages:", pageNumbers);

      let textContent = '';
      for (const pageNum of pageNumbers) {
        const page = await pdfDocument.getPage(pageNum);
        const text = await page.getTextContent();
        textContent += text.items.map((item: TextItem | any) => {
          return 'str' in item ? item.str : '';
        }).join(' ');
        textContent += '\n'; // Add newline between pages
      }

      setExtractedText(textContent); // Display extracted text in the UI
      console.log("--- Extracted Selected Pages Text ---");
      console.log(textContent);
      console.log(`--- End Extracted Text (${textContent.length} chars) ---`);

      if (!textContent.trim()) {
         // This might happen if selected pages have no text
         console.warn("Selected pages resulted in empty text content.");
         // Depending on desired behavior, you might throw an error or allow it
         // throw new Error(t('errorNoTextExtractedFromSelection'));
      }

      // --- Temporarily skip API call --- //
      /* ... API call ... */
      console.log("Selected page extraction test successful (API call skipped).");

      // Hide the selector and clear PDF state after successful extraction
      setShowPageSelector(false);
      setPdfDocument(null);
      setTotalPages(null);
      setSelectedPagesInput('');

    } catch (err: any) {
      console.error("Error extracting selected pages:", err);
      setError(err.message || t('errorExtractingSelected'));
      setExtractedText(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPageSelection = () => {
     setShowPageSelector(false);
     setPdfDocument(null);
     setTotalPages(null);
     setSelectedPagesInput('');
     setError(null); // Clear any previous errors
     setIsLoading(false); // Ensure loading is off
     // Optionally reset the file input?
     // setSelectedFile(null);
     // setFileName('');
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Input Section - Always Visible unless page selector is shown? Or maybe keep visible? */} 
          {!showPageSelector && (
             <div className="space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="file-upload" className="text-sm font-medium">{t('uploadLabel')}</Label>
                    <Input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.docx,.pptx"
                    onChange={handleFileChange}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    {fileName && <p className="text-sm text-muted-foreground mt-1">{t('selectedFileLabel')}: {fileName}</p>}
                </div>

                <Button onClick={handleInitialSummarize} disabled={!selectedFile || isLoading}>
                    {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('loadingButton')}
                    </>
                    ) : (
                    t('summarizeButton')
                    )}
                </Button>
            </div>
          )}

          {/* Page Selector UI - Conditionally Rendered */}
          {showPageSelector && totalPages && (
            <Card className="bg-muted/50 border-dashed">
              <CardHeader>
                <CardTitle>{t('pageSelectorTitle')}</CardTitle>
                <CardDescription>{t('pageSelectorDescription', { count: totalPages })}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="page-input">{t('pageInputLabel')}</Label>
                  <Input
                    id="page-input"
                    type="text"
                    placeholder={t('pageInputPlaceholder')}
                    value={selectedPagesInput}
                    onChange={(e) => setSelectedPagesInput(e.target.value)}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">{t('pageInputExample')}</p>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleExtractSelectedPages} disabled={isLoading || !selectedPagesInput.trim()}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('extractingButton')}
                      </>
                    ) : (
                      t('confirmPagesButton')
                    )}
                  </Button>
                   <Button variant="outline" onClick={handleCancelPageSelection} disabled={isLoading}>{t('cancelButton')}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */} 
          {error && (
            <Alert variant="destructive">
              <AlertTitle>{t('errorTitle')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Extracted Text Display */}
      {extractedText && !isLoading && !error && (
         <Card>
            <CardHeader>
               <CardTitle>{t('extractedTextTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
               <Textarea value={extractedText} readOnly rows={10} className="w-full text-sm bg-muted/40"/>
            </CardContent>
         </Card>
      )}

      {/* Summary Display (still commented out for testing) */}
      {summary && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>{t('summaryTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={summary} readOnly rows={15} className="w-full"/>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
