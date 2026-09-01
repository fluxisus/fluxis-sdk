import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@fluxisus/react': path.resolve(
        repoRoot,
        'packages/frontend/react/dist/index.js',
      ),
      '@fluxisus/react-wallet': path.resolve(
        repoRoot,
        'packages/frontend/react-wallet/dist/index.js',
      ),
      '@fluxisus/wallet-core': path.resolve(
        repoRoot,
        'packages/frontend/wallet-core/dist/index.js',
      ),
      react: path.resolve(repoRoot, 'node_modules/react'),
      'react-dom': path.resolve(repoRoot, 'node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', 'qrcode.react'],
    force: true,
  },
  server: {
    port: 5174,
    strictPort: false,
    open: true,
    proxy: {
      // The CDN doesn't send Access-Control-Allow-Origin for this dev origin, so route
      // through the dev server instead of fetching https://assets.fluxis.us directly —
      // same-origin from the browser's point of view, no CORS involved.
      '/cdn-assets': {
        target: 'https://assets.fluxis.us',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/cdn-assets/, ''),
      },
    },
  },
});
