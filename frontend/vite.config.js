import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://35.157.85.194',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path, // Don't rewrite the path
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})

