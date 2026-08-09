import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

interface ThemeState {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const systemPrefersDark = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const resolve = (mode: ThemeMode): ResolvedTheme =>
  mode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : mode;

/** Apply the resolved theme to <html> (class + color-scheme). */
function applyTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.classList.toggle('light', resolved === 'light');
  root.style.colorScheme = resolved;
}

// Canonical theme engine (Zustand); replaces the legacy useTheme hook as the single source of truth once the new app shell is wired (P2).
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      resolved: 'dark',
      setMode: (mode) => {
        const resolved = resolve(mode);
        applyTheme(resolved);
        set({ mode, resolved });
      },
      toggle: () => {
        const next: ThemeMode = get().resolved === 'dark' ? 'light' : 'dark';
        get().setMode(next);
      },
    }),
    {
      name: 'portfolio-theme',
      partialize: (s) => ({ mode: s.mode }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const resolved = resolve(state.mode);
        applyTheme(resolved);
        state.resolved = resolved;
      },
    }
  )
);

/** Call once at app start: applies persisted theme + live system sync. */
export function initThemeSync(): () => void {
  const { mode, setMode } = useThemeStore.getState();
  applyTheme(resolve(mode));
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    if (useThemeStore.getState().mode === 'system') setMode('system');
  };
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
