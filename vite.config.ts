import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/sbapi': {
          target: env.VITE_SUPABASE_URL,
          changeOrigin: true,
          ws: true, // Habilitar suporte a WebSocket para Supabase Realtime
          rewrite: (path) => path.replace(/^\/sbapi/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.error('[Vite Proxy Error]:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // Garantir que o Host está correto para evitar rejeição do Supabase
              const targetURL = new URL(env.VITE_SUPABASE_URL);
              proxyReq.setHeader('Host', targetURL.host);

              // Não forçar keep-alive em Upgrades (WebSockets) para não quebrar o handshake
              if (req.headers.upgrade !== 'websocket') {
                proxyReq.setHeader('Connection', 'keep-alive');
              }

              console.log(`[Proxy Request]: ${req.method} ${req.url}`);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
                console.warn(`[Proxy Response Error]: ${proxyRes.statusCode} for ${req.url}`);
              }
            });
          },
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
