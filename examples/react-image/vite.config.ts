import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: [
      { find: 'vue-ai-hooks/react', replacement: resolve(__dirname, '../../src/react.ts') },
      { find: 'vue-ai-hooks', replacement: resolve(__dirname, '../../src/index.ts') }
    ]
  },
  server: {
    port: 5186
  }
})
