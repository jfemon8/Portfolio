import { create } from 'zustand';

interface UIState {
  commandOpen: boolean;
  mobileNavOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  toggleCommand: () => void;
  setMobileNavOpen: (open: boolean) => void;
}

// Ephemeral global UI state only (command palette, mobile nav) — server data stays in TanStack Query, not here.
export const useUIStore = create<UIState>((set) => ({
  commandOpen: false,
  mobileNavOpen: false,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
}));
