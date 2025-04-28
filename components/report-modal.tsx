'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
// TODO: Add translations if needed

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const t = useTranslations();
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    if (!content.trim()) {
      setError('Please describe the issue.'); // TODO: Translate
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit report.'); // TODO: Translate
      }

      // Report submitted successfully
      setSuccess(true);
      setContent(''); // Clear the textarea
      // Optional: Close modal after a delay or keep it open showing success
      setTimeout(() => {
         onClose(); // Close after 2 seconds
         setSuccess(false); // Reset success state for next time
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.'); // TODO: Translate
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
      if (isLoading) return; // Prevent closing while submitting
      setContent(''); // Clear content
      setError(null);
      setSuccess(false);
      setIsLoading(false);
      onClose(); // Call the parent's onClose handler
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('reportModalTitle')}</DialogTitle>
          <DialogDescription>
            {t('reportModalDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <Textarea
              id="content"
              placeholder={t('reportModalPlaceholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              disabled={isLoading || success}
            />
            {error && <p className="text-sm text-red-600">{t('reportModalError')}</p>}
            {success && <p className="text-sm text-green-600">{t('reportModalSuccess')}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              {t('reportModalCancel')}
            </Button>
            <Button type="submit" disabled={isLoading || success || !content.trim()}>
              {isLoading ? t('reportModalSubmitting') : t('reportModalSubmit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 