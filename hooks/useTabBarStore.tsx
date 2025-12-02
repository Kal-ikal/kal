import { create } from 'zustand';

interface TabBarState {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
}

export const useTabBarStore = create<TabBarState>((set) => ({
  isVisible: true, // Default visible
  setIsVisible: (visible) => set({ isVisible: visible }),
}));