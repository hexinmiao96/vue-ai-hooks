import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      'vue-ai-hooks/react': resolve(__dirname, '../../src/react.ts'),
      'vue-ai-hooks': resolve(__dirname, '../../src/index.ts')
    }
  },
  server: {
    port: 5185
  }
})
