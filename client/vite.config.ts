import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
    // Dev-only proxies — production uses `vercel.json` rewrites for the
    // same paths. Without these, hitting `/site.webmanifest` in dev returns
    // the SPA index.html and the browser logs "Manifest: Line 1, column 1,
    // Syntax error" because the dynamic manifest lives on the API server.
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/site.webmanifest': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => `/api${path}`,
      },
      '/robots.txt': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => `/api${path}`,
      },
      '/sitemap.xml': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => `/api${path}`,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: [
            'react',
            'react-dom',
            'react-router-dom',
            '@tanstack/react-query',
            'react-helmet-async',
          ],
          motion: ['motion'],
          charts: ['recharts'],
        },
      },
    },
  },
});
