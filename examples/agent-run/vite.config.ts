import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  root: __dirname,
  plugins: [vue()],
  resolve: {
    alias: {
      'vue-ai-hooks': resolve(__dirname, '../../src/index.ts')
    }
  },
  server: {
    port: 5188
  }
})
