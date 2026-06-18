import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// The dev server proxies API + swagger calls to the Axum backend so the SPA can
// use same-origin relative URLs in every environment.
const backend = process.env.VITE_BACKEND ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
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
