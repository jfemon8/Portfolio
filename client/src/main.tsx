import React from 'react';
import ReactDOM from 'react-dom/client';
import Providers from '@/app/Providers';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import App from './App';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Providers>
        <App />
      </Providers>
    </ErrorBoundary>
  </React.StrictMode>
);
