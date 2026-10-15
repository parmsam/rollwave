import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

/** Short commit of this build — GitHub Actions provides it; locally, ask git; elsewhere, omit it. */
function buildCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}

// Must match the GitHub repo name exactly — this is a project site
// (https://parmsam.github.io/rollwave/), not a user/org root site.
const base = '/rollwave/'

export default defineConfig({
  base,
  // Shown at the bottom of Settings, so "which version am I on?" has an answer.
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(buildCommit()),
  },
  plugins: [
    preact(),
    tailwindcss(),
    VitePWA({
      // 'prompt', not 'autoUpdate': a new version waits until the user taps
      // Reload (see hooks/useAppUpdate.ts), so it can never swap the app
      // out from under a running session.
      registerType: 'prompt',
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
