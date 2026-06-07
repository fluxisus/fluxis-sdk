import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@fluxisus/react': path.resolve(
        repoRoot,
        'packages/frontend/react/dist/index.js',
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
    port: 5173,
    strictPort: false,
    open: true,
    proxy: {
      '/sdk-assets': {
        target: 'https://assets.fluxis.us',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
