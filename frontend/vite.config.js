import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the Vite dev server proxies /api to the NestJS backend, so no CORS setup is needed.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom', 'react-router-dom', 'react-redux', '@reduxjs/toolkit'], charts: ['recharts'] } } },
  },
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
});
