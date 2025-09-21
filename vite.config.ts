import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Tambahkan baris ini! Ganti 'ai-narasi-optimizer' dengan nama repo Anda
  base: '/ai-narasi-optimizer/', 
  plugins: [react()],
})
