// @ts-check
const path = require('node:path');
const fs = require('node:fs');

const repoRoot = path.resolve(__dirname, '../../..');

/**
 * Mirrors tsup's `loader: { '.svg': 'text' }` so Vite loads SVG files as raw
 * strings instead of asset URLs. Without this, `svgToDataUri(svgString)` in
 * the package source receives a URL and produces a broken data URI.
 * @returns {import('vite').Plugin}
 */
function svgRawPlugin() {
  return {
    name: 'svg-raw',
    enforce: /** @type {'pre'} */ ('pre'),
    load(/** @type {string} */ id) {
      if (id.endsWith('.svg')) {
        const content = fs.readFileSync(id, 'utf-8');
        return `export default ${JSON.stringify(content)};`;
      }
    },
  };
}

/**
 * Mirrors the mock in examples/demo-react/vite.config.ts. Status advances on
 * elapsed wall-clock time since last reset, not request count.
 * @returns {import('vite').Plugin}
 */
function mockPaymentStatusPlugin() {
  const PENDING_MS = 6000;
  const PROCESSING_MS = 12000;
  let startedAt = Date.now();

  return {
    name: 'mock-payment-status',
    configureServer(/** @type {import('vite').ViteDevServer} */ server) {
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

/** @type {import('@storybook/react-vite').StorybookConfig} */
const config = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal(viteConfig) {
    viteConfig.resolve = viteConfig.resolve ?? {};
    const existingAlias =
      viteConfig.resolve.alias && !Array.isArray(viteConfig.resolve.alias)
        ? viteConfig.resolve.alias
        : {};
    viteConfig.resolve.alias = {
      ...existingAlias,
      '@fluxisus/react': path.resolve(repoRoot, 'packages/frontend/react/src/index.ts'),
      react: path.resolve(repoRoot, 'node_modules/react'),
      'react-dom': path.resolve(repoRoot, 'node_modules/react-dom'),
    };
    viteConfig.resolve.dedupe = ['react', 'react-dom'];
    viteConfig.plugins = viteConfig.plugins ?? [];
    viteConfig.plugins.push(svgRawPlugin(), mockPaymentStatusPlugin());
    return viteConfig;
  },
};

module.exports = config;
