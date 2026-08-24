import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Telegram Mini Apps обычно раздаются с подпути (GitHub Pages / CDN).
  base: process.env.VITE_BASE_PATH ?? '/',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
