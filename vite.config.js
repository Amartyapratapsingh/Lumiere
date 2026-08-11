import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'client',
  plugins: [react()],
  server: {
    port: 5173,
    // Dual-stack: without this Vite binds ::1 only, and browsers that resolve
    // "localhost" to 127.0.0.1 get connection refused.
    host: '::',
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // Seller-uploaded product photos are served by the API, not from public/.
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
