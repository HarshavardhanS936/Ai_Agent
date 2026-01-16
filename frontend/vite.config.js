import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/chat': 'http://127.0.0.1:8080',
      '/api': 'http://127.0.0.1:8080',
      '/clear_history': 'http://127.0.0.1:8080',
      '/uploads': 'http://127.0.0.1:8080'
    }
  }
})
