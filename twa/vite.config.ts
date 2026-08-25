import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/** Домены туннелей, через которые мини-приложение открывают с телефона. */
const tunnelHosts = [
  '.trycloudflare.com',
  '.ngrok-free.app',
  '.ngrok.io',
  '.loca.lt',
  '.serveo.net',
]

export default defineConfig(({ mode }) => {
  // base читается здесь, а не из src, поэтому import.meta.env недоступен:
  // значения из .env-файлов достаём вручную. Переменная окружения всё ещё
  // побеждает файл — так удобно собирать разово из командной строки.
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }

  return {
  plugins: [react()],
  // Telegram Mini Apps обычно раздаются с подпути (GitHub Pages / CDN).
  base: env.VITE_BASE_PATH || '/',
  server: {
    host: true,
    port: 5173,
    // Без этого dev-сервер отвечает «Blocked request» на домен туннеля.
    allowedHosts: env.VITE_ALLOWED_HOSTS
      ? env.VITE_ALLOWED_HOSTS.split(',').map((host) => host.trim())
      : tunnelHosts,
    // За HTTPS-туннелем клиент HMR должен идти в 443/wss, иначе живая перезагрузка молчит.
    hmr: env.VITE_TUNNEL === 'true' ? { protocol: 'wss', clientPort: 443 } : undefined,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  }
})
