import { type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/context/AuthContext';

// Provider order is intentional and stable; theme init lives in PublicLayout (initThemeSync) instead, so it runs within the routed tree.
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
                  background: 'var(--glass-bg-strong)',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '1.5rem',
                  boxShadow:
                    'inset 0 0.0625rem 0 var(--glass-highlight), 0 1.25rem 3rem -0.75rem var(--glass-shadow)',
                  backdropFilter:
                    'blur(1.875rem) saturate(150%) brightness(105%)',
                  WebkitBackdropFilter:
                    'blur(1.875rem) saturate(150%) brightness(105%)',
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
