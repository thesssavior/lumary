'use client';

import { useToast } from '@/hooks/use-toast';
import {
  Toast,
  ToastClose,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, action, ...props }) {
        return (
          <Toast key={id} {...props} className="justify-center">
            <div className="grid gap-1 text-center w-full">
              {title && <ToastTitle className="text-center">{title}</ToastTitle>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport className="!fixed !top-4 !left-1/2 !transform !-translate-x-1/2 !bottom-auto !right-auto z-[100] flex max-h-screen w-auto flex-col p-4 md:max-w-[420px]" />
    </ToastProvider>
  );
}
