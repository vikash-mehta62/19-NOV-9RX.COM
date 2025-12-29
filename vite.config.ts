
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Disable sourcemaps in production to reduce bundle size
    sourcemap: mode === 'development',
    // Minify for production
    minify: 'esbuild',
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Chunk size warning limit (reduced for better performance monitoring)
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Better code splitting for caching
        manualChunks: {
          // Core React
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Redux state management
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux', 'redux'],
          // UI components library
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
          ],
          // Form handling
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod', 'yup'],
          // Charts and visualization
          'vendor-charts': ['recharts'],
          // PDF generation (loaded on demand)
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'pdf-lib'],
          // Date utilities
          'vendor-date': ['date-fns'],
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
          // Animation
          'vendor-animation': ['framer-motion'],
        },
      },
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
    ],
  },
}));
