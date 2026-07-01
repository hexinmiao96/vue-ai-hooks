import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        react: resolve(__dirname, 'src/react.ts')
      },
      name: 'VueAiHooks',
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`,
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['vue', 'react'],
      output: {
        globals: {
          react: 'React',
          vue: 'Vue'
        }
      }
    }
  }
})
