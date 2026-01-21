import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'  // <--- IMPORTAR EL PLUGIN

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <--- ACTIVAR EL PLUGIN
  ],
  server: {
    port: 5173,
  }
})