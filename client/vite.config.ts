import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  publicDir: false,
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        login: 'login.html',
        index: 'index.html',
        admin: 'admin.html',
      },
    },
  },
})
