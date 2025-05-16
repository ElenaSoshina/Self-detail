import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',    // слушать на всех интерфейсах
    port: 5173,         // или любой свободный порт
    proxy: {
      '/api': {
        target: 'https://backend.self-detailing.duckdns.org',
        changeOrigin: true,
        secure: false,
        rewrite: path => path.replace(/^\/api/, '/api'),
      }
    }
  }
})
