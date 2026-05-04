import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/bowtie-model-app/', // 設定為新的 Repository 名稱
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
