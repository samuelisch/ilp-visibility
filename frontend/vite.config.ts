import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // FE calls same-origin /api/*; Vite forwards to the NestJS server.
      // No rewrite: NestJS serves under the /api prefix, so the path passes through unchanged.
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
