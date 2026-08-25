import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Домены туннелей, через которые мини-приложение открывают с телефона. */
const tunnelHosts = [
  '.trycloudflare.com',
  '.ngrok-free.app',
  '.ngrok.io',
  '.loca.lt',
  '.serveo.net',
]

export default defineConfig({
  plugins: [react()],
  // Telegram Mini Apps обычно раздаются с подпути (GitHub Pages / CDN).
  base: process.env.VITE_BASE_PATH ?? '/',
  server: {
    host: true,
    port: 5173,
    // Без этого dev-сервер отвечает «Blocked request» на домен туннеля.
    allowedHosts: process.env.VITE_ALLOWED_HOSTS
      ? process.env.VITE_ALLOWED_HOSTS.split(',').map((host) => host.trim())
      : tunnelHosts,
    // За HTTPS-туннелем клиент HMR должен идти в 443/wss, иначе живая перезагрузка молчит.
    hmr: process.env.VITE_TUNNEL === 'true' ? { protocol: 'wss', clientPort: 443 } : undefined,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
