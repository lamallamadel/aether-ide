import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const desktop = process.env.VITE_DESKTOP === '1'

export default defineConfig({
  /** Chemins relatifs pour `loadFile` Electron ; `/` pour déploiement web habituel. */
  base: desktop ? './' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      path: 'path-browserify',
      url: 'url',
    },
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return
        }
        if (warning.message.includes('Use of direct `eval`')) {
          return
        }
        warn(warning)
      },
      external: ['fs/promises', 'module'],
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', '**/*.test.ts', '**/*.test.tsx', 'src/test/'],
      thresholds: {
        statements: 65,
        branches: 55,
        functions: 64,
        lines: 65,
      },
    },
  },
})
