import { type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/context/AuthContext';

/**
 * Central app provider composition. Single place that wires data, routing,
 * auth and notifications — keeps `main.tsx` a thin entry point
 * (project rule #4/#8). Provider order is intentional and stable.
 *
 * Theme: the canonical Zustand engine (`@/stores/theme`) is initialised in
 * the premium shell (`PublicLayout` → `initThemeSync`); the legacy hook was
 * retired in P2. Kept out of here so it runs within the routed tree.
 */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <AuthProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                  fontSize: '14px',
                },
                success: {
                  iconTheme: { primary: '#00ffd1', secondary: '#0a0a0f' },
                },
                error: {
                  iconTheme: { primary: '#ec4899', secondary: '#0a0a0f' },
                },
              }}
            />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
