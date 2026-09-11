import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mercadoCentralApiPlugin } from './vite.mercadoCentralPlugin'

export default defineConfig({
  plugins: [react(), mercadoCentralApiPlugin()],
  server: {
    // Evita que el HMR choque con el middleware de /api
    proxy: undefined,
  },
})
