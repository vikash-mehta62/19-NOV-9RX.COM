
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { Provider } from 'react-redux';
import { store } from './store/store';
import { ToastProvider } from '@radix-ui/react-toast';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

const root = createRoot(rootElement)

root.render(
  // <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Provider store={store}>
          <ThemeProvider defaultTheme="light" attribute="class">
            <ToastProvider>
              <App />
              <Toaster />
              <SonnerToaster position="top-right" richColors closeButton />
            </ToastProvider>
          </ThemeProvider>
        </Provider>
      </BrowserRouter>
    </QueryClientProvider>
  // </StrictMode>
)
