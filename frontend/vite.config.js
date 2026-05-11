import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  build: {
    // Split vendor deps into separate chunks for long-term browser caching:
    // app code changes frequently, vendors don't.
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'http': ['axios'],
        },
      },
    },
    // Raise chunk size warning threshold (default 500kb) since lazy chunks are intentional.
    chunkSizeWarningLimit: 800,
  },
})
