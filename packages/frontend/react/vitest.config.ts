import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    {
      name: 'svg-text-loader',
      enforce: 'pre',
      load(id) {
        if (id.endsWith('.svg')) {
          const svg = readFileSync(id, 'utf-8');
          return `export default ${JSON.stringify(svg)}`;
        }
      },
    },
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
});
