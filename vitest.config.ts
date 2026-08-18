// Vitest loads this config as CommonJS in this package.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('node:path');

module.exports = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
};
