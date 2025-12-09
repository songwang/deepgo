import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mobx: ['mobx', 'mobx-react-lite']
        }
      }
    }
  },
  esbuild: {
    keepNames: true,
  },
  css: {
    devSourcemap: true
  },
  server: {
    sourcemapIgnoreList: false,
    fs: {
      allow: ['..']
    }
  }
})
