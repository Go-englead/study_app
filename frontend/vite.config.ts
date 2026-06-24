import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // 先に Router プラグイン（routeTree.gen.ts を生成）→ react
    // bulletproof 風に app/routes をルート配置場所にする
    TanStackRouterVite({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './src/app/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    react(),
  ],
  server: {
    // docker からも届くよう host を開ける
    host: true,
    port: Number(process.env.VITE_PORT ?? 5173),
    // /api を API サーバへプロキシ（CORS回避）。docker は api:3000、ローカルは localhost:3000。
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
    // docker のポートマッピング越しでも HMR websocket が繋がるようにする
    hmr: process.env.VITE_HMR_CLIENT_PORT
      ? { clientPort: Number(process.env.VITE_HMR_CLIENT_PORT) }
      : undefined,
  },
})
