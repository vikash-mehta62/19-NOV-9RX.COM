
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { Provider } from 'react-redux';
import { store } from './store/store';
import { ToastProvider } from '@radix-ui/react-toast';
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
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
            </ToastProvider>
          </ThemeProvider>
        </Provider>
      </BrowserRouter>
    </QueryClientProvider>
  // </StrictMode>
)
