import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  root: __dirname,
  plugins: [vue()],
  resolve: {
    alias: {
      'vue-ai-hooks': resolve(__dirname, '../../src/index.ts')
    }
  },
  server: {
    port: 5184
  }
})
