import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { configureApi } from './api';

const queryClient = new QueryClient();

// Initialise the API client from persisted Electron settings before mounting.
async function bootstrap() {
  try {
    const res = await window.electronAPI.loadSettings();
    if (res.success && res.settings) {
      const { apiBaseUrl, apiToken } = res.settings;
      configureApi(apiBaseUrl ?? 'https://core-apis-m03n.onrender.com', apiToken ?? null);
    }
  } catch {
    // If Electron IPC is unavailable (e.g. browser dev mode), use defaults.
    configureApi('https://core-apis-m03n.onrender.com', null);
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ThemeProvider defaultTheme="light" storageKey="erp-theme">
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <App />
            <Toaster richColors position="top-right" />
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}

bootstrap();
