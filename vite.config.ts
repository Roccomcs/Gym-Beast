import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), tailwind(), VitePWA({
    registerType: 'prompt',
    workbox: { clientsClaim: true, globPatterns: ['**/*.{js,css,html,ico,png,jpg,webp,svg,woff,woff2}'] },
    includeAssets: ['icon.svg', 'apple-touch-icon.png'],
    manifest: {
      name: 'GymBeast', short_name: 'GymBeast', lang: 'es-AR',
      start_url: '/', display: 'standalone', orientation: 'portrait',
      theme_color: '#131316', background_color: '#131316',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  })],
})
