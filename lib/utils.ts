import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Tiktoken } from "js-tiktoken/lite";
import o200k_base from "js-tiktoken/ranks/o200k_base";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Layout preference utilities
export const getLayoutPreference = (): 'default' | 'split' => {
  if (typeof window === 'undefined') return 'default';
  const savedLayoutMode = localStorage.getItem('layoutMode');
  return (savedLayoutMode === 'split' || savedLayoutMode === 'default') 
    ? savedLayoutMode 
    : 'default';
};

export const setLayoutPreference = (mode: 'default' | 'split') => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('layoutMode', mode);
  
  // Dispatch custom event to notify other components
  window.dispatchEvent(new CustomEvent('layoutChanged', { 
    detail: { layoutMode: mode } 
  }));
};

// Format seconds into M:SS or H:MM:SS (only shows hours if > 0)
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}


// Function to calculate token count for a given text
export function calculateTokenCount(text: string) {
  const encoder = new Tiktoken(o200k_base);
  const tokens = encoder.encode(text);
  return tokens.length;
}

// Format time string by removing leading zeros and formatting appropriately
export function formatTimeString(time: string | number): string {
  // If it's a number, convert it using the existing formatTime function
  if (typeof time === 'number') {
    return formatTime(time);
  }
  
  // If it's not a string, return as is
  if (!time || typeof time !== 'string') {
    return String(time);
  }
  
  // Sanitize to remove any non-digit and non-colon chars (e.g., brackets)
  const sanitized = time.trim().replace(/[^0-9:]/g, '');
  const parts = sanitized.split(':');
  
  if (parts.length === 3) {
    // Format: hh:mm:ss
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parts[1];
    const seconds = parts[2];
    
    if (hours === 0) {
      // Less than an hour: show as "5:23" for readability
      return `${minutes}:${seconds}`;
    } else {
      // More than an hour: remove leading zero from hours "01:11:35" -> "1:11:35"
      return `${hours}:${minutes}:${seconds}`;
    }
  } else if (parts.length === 2) {
    // Already in mm:ss format
    return sanitized;
  }
  
  return sanitized || String(time);
}

// Convert time string (hh:mm:ss) to seconds for video seeking
export function timeStringToSeconds(timeString: string | number): number {
  if (typeof timeString === 'number') {
    return timeString;
  }
  
  if (!timeString || typeof timeString !== 'string') {
    return 0;
  }
  
  // Sanitize to remove any non-digit and non-colon chars (e.g., brackets)
  const sanitized = timeString.trim().replace(/[^0-9:]/g, '');
  const parts = sanitized.split(':');
  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parseInt(parts[2], 10) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseInt(parts[1], 10) || 0;
    return minutes * 60 + seconds;
  }
  
  return 0;
}
