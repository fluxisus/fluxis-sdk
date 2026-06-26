import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

/**
 * Stands in for a merchant backend route during manual testing of
 * usePaymentStatus. Real integrations proxy pointOfSale.getPaymentRequest()
 * server-side instead of returning a canned state machine.
 *
 * Status advances on elapsed wall-clock time since the last reset, NOT on
 * how many times the route has been hit. A real payment doesn't complete
 * faster just because the shopper checks status more often — this mock
 * must behave the same way, or manual "refetch" clicks (and React
 * StrictMode's dev-only double-invoked effects) would visibly distort the
 * simulated timeline.
 */
function mockPaymentStatusPlugin(): Plugin {
  const PENDING_MS = 6000;
  const PROCESSING_MS = 12000;
  let startedAt = Date.now();

  return {
    name: 'mock-payment-status',
    configureServer(server) {
      server.middlewares.use('/api/payment-status/demo', (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost');

        if (url.searchParams.has('reset')) {
          startedAt = Date.now();
        }

        if (url.searchParams.has('fail')) {
          res.statusCode = 500;
          res.end('simulated backend error');
          return;
        }

        const elapsedMs = Date.now() - startedAt;
        const status =
          elapsedMs < PENDING_MS ? 'pending' : elapsedMs < PROCESSING_MS ? 'processing' : 'completed';

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ id: 'demo', status, elapsedMs }));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), mockPaymentStatusPlugin()],
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
