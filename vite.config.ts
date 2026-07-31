import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Must match the GitHub repo name exactly — this is a project site
// (https://parmsam.github.io/rollwave/), not a user/org root site.
const base = '/rollwave/'

export default defineConfig({
  base,
  plugins: [
    preact(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,mp3,woff2}'],
      },
      manifest: {
        id: base,
        name: 'ROLLWAVE — BJJ Round Timer',
        short_name: 'ROLLWAVE',
        description: 'A futuristic round timer for BJJ training, drilling, and competition.',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#05070d',
        theme_color: '#05070d',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
