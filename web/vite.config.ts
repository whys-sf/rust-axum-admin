import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// The dev server proxies API + swagger calls to the Axum backend so the SPA can
// use same-origin relative URLs in every environment.
const backend = process.env.VITE_BACKEND ?? 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // must precede the react plugin so generated routes are picked up
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/swagger-ui': { target: backend, changeOrigin: true },
      '/api-docs': { target: backend, changeOrigin: true },
    },
  },
})
