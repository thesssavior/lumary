import { create } from 'zustand';

interface ServerState {
  isServerDown: boolean;
  setServerDown: (isDown: boolean) => void;
}

export const useServerState = create<ServerState>((set) => ({
  isServerDown: false,
  setServerDown: (isDown: boolean) => set({ isServerDown: isDown }),
})); 