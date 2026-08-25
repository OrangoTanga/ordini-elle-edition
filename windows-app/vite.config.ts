import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      external: ['electron'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api/': {
        target: 'https://ordini-elly-worker.elly-order.workers.dev',
        changeOrigin: true,
      },
      '/health': {
        target: 'https://ordini-elly-worker.elly-order.workers.dev',
        changeOrigin: true,
      },
    },
  },
})
