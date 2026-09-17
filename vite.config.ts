import { defineConfig } from 'vite'
import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

function gitInfo(cmd: string, fallback: string): string {
  try {
    return execSync(cmd).toString().trim()
  } catch {
    // Not in a git checkout (e.g. some CI export) — don't fail the build.
    return fallback
  }
}

const commitHash = gitInfo('git rev-parse --short HEAD', 'unknown')
// %cI = committer date, strict ISO 8601 — stable across git versions/locales.
const commitDate = gitInfo('git log -1 --format=%cI', '')

export default defineConfig({
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
    __COMMIT_DATE__: JSON.stringify(commitDate),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // `injectManifest` (not the default `generateSW`) so we can own
      // sw.ts and add a custom fetch handler for PDF export — see its
      // comment for why.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Stitches on Fire',
        short_name: 'Stitches',
        description: 'Mobile crochet chart assistant',
        theme_color: '#1e2327',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
})
