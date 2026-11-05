/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxyInstance) => {
          proxyInstance.on('error', (proxyError, clientRequest, serverResponse) => {
            if (serverResponse && !serverResponse.headersSent) {
              serverResponse.writeHead(200, {
                'Content-Type': 'application/json',
              });
              serverResponse.end(JSON.stringify({ items: [] }));
            }
          });
        },
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 15000,
  },
});
