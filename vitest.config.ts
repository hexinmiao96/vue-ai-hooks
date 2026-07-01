import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'vue-ai-hooks/react': resolve(__dirname, 'src/react.ts'),
      'vue-ai-hooks': resolve(__dirname, 'src/index.ts')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    coverage: {
      all: false,
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.config.*'],
      thresholds: {
        statements: 98,
        branches: 90,
        functions: 96,
        lines: 98
      }
    }
  }
})
