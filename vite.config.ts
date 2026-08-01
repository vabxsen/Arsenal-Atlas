import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'Arsenal Atlas',
        short_name: 'Arsenal Atlas',
        description: "A premium encyclopedia of the world's military equipment.",
        theme_color: '#020202',
        background_color: '#020202',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Firebase is ~589 KB and only needed if someone signs in. Precaching
        // it means every visitor downloads it in the background on first load
        // even though the default build has no credentials at all. Excluded
        // here and cached at runtime instead, on first actual use.
        globIgnores: ['**/firebase-*.js'],
        // Note: the 431 prerendered route shells are not in the precache
        // manifest either, because scripts/prerender.ts runs after vite build
        // and therefore after the manifest is generated. That is the desired
        // outcome — offline navigation falls back to the cached app shell.
        runtimeCaching: [
          {
            urlPattern: /\/assets\/firebase-.*\.js$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'firebase-sdk',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // The other half of the hotlink strategy: Wikimedia images
            // are immutable at a given URL, so cache them hard.
            urlPattern: /^https:\/\/upload\.wikimedia\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wikimedia-images',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    cssTarget: 'chrome111',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split the heavy, independently-cacheable libraries so a content
        // change never invalidates the vendor chunks.
        //
        // Vite 8 bundles with Rolldown, which requires the function form —
        // the object map that worked under Rollup throws at build time.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router)/.test(id)) {
            return 'react';
          }
          if (id.includes('firebase') || id.includes('@firebase') || id.includes('protobufjs')) {
            return 'firebase';
          }
          if (/motion-dom|motion-utils|framer-motion/.test(id)) return 'motion';
          if (/d3-geo|d3-array|topojson/.test(id)) return 'geo';
          return;
        },
      },
    },
  },
});
