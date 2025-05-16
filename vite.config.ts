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
        prependPath: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Отправка запроса:', req.method, req.url);
            proxyReq.setHeader('Origin', 'https://frontend.self-detailing.duckdns.org');
            if (req.method === 'POST') {
              console.log('Это POST запрос. Заголовки:', JSON.stringify(proxyReq.getHeaders()));
            }
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Получен ответ:', proxyRes.statusCode, req.url, 'для метода', req.method);
            if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
              console.log('Ошибка при проксировании:', proxyRes.statusCode, req.url);
            }
          });
        }
      }
    }
  }
})
