export {}; // Make this file a module

declare global {
  interface Window {
    showServerMaintenanceModal?: () => void; // Declare our custom function type
  }
} 