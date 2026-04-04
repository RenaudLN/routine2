import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/routine2/',
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'inline', // Inlines the registration script to avoid 404s on registerSW.js
      includeAssets: ['favicon.ico', 'logo-color.svg', 'screenshots/narrow.png'],
      manifest: {
        name: 'Routine',
        short_name: 'Routine',
        description: 'Track and manage your daily habits',
        theme_color: '#863bff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/routine2/',
        start_url: '/routine2/',
        icons: [
          {
            "src": "logo-color.svg",
            "sizes": "512x512"
          },
          {
            "src": "logo-color.svg",
            "sizes": "192x192"
          },
          {
            "src": "logo-color.svg",
            "sizes": "144x144"
          },
          {
            "src": "logo-color.svg",
            "sizes": "96x96"
          },
          {
            "src": "logo-color.svg",
            "sizes": "72x72"
          },
          {
            "src": "logo-color.svg",
            "sizes": "48x48"
          }
        ],
        screenshots: [
          {
            "src": "screenshots/narrow.png",
            "sizes": "800x1600",
            "type": "image/png",
            "form_factor": "narrow",
            "label": "Application"
          },
        ],
        shortcuts: [],
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
