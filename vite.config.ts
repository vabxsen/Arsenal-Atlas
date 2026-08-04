import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Written as a char code rather than a literal so no layer of escaping between
 * here and the bundler can quietly turn it into something else.
 */
const WINDOWS_SEP = String.fromCharCode(92);

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
        theme_color: '#090909',
        background_color: '#090909',
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
        // The admin bundle is excluded on the same grounds: it is ~35 KB
        // gzipped that only an admin will ever execute, and precaching pushes
        // it onto every visitor in the background.
        globIgnores: ['**/firebase-*.js', '**/admin-*.js'],
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
            urlPattern: /\/assets\/admin-.*\.js$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'admin-bundle',
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
    /* Safari matters here: this is an Apple-styled interface, and Safari only
       implements unprefixed `backdrop-filter` from 18. Naming Safari in the
       target list is what makes Lightning CSS emit the -webkit- alias
       alongside the standard property; with `chrome111` alone the frosted nav
       silently lost its blur on any older Safari. */
    cssTarget: ['chrome111', 'safari15', 'firefox115'],
    sourcemap: false,
    rollupOptions: {
      output: {
        /**
         * Name the code-split admin chunks `admin-*` so the service worker can
         * exclude them by glob below.
         *
         * Done here rather than by forcing them into a manual chunk, which was
         * tried and is a trap: once `admin` is a named manual chunk the bundler
         * folds shared vendor code into it — react-query and lucide's icon
         * factory both ended up there — and because the rest of the app needs
         * those, the *entry* gained a static import of the admin chunk. That
         * put ~70 KB gzipped of dashboard on every page load, the exact thing
         * the split exists to prevent — the build succeeded, every test passed,
         * and the only symptom was a number in a size table.
         * `npm run verify:bundle` asserts it cannot happen again.
         *
         * Naming leaves chunking untouched: admin stays reachable only through
         * its dynamic import.
         */
        chunkFileNames(chunk: { name: string; moduleIds?: string[] }) {
          // Paths arrive with platform separators; normalise before matching,
          // or this silently never fires on Windows and the globIgnores below
          // stop excluding anything.
          const appModules = (chunk.moduleIds ?? [])
            .map((id) => id.split(WINDOWS_SEP).join('/'))
            // Virtual modules and vendor code say nothing about which feature
            // a chunk belongs to.
            .filter((id) => !id.includes('node_modules') && !id.startsWith('\0'))
            .filter((id) => !id.includes('/node_modules/'));

          // Admin-only means: it contains admin code, and contains no feature
          // code from anywhere else. `shared/` is allowed through — the chunk
          // carrying useAdminData also pulls in shared/schema and zod, and
          // requiring *every* module to sit under features/admin would leave
          // that 20 KB gzipped in the precache for everyone.
          const admin = appModules.filter((id) => id.includes('/src/features/admin/'));
          const otherFeature = appModules.filter(
            (id) => id.includes('/src/') && !id.includes('/src/features/admin/')
          );
          const isAdminOnly = admin.length > 0 && otherFeature.length === 0;

          return isAdminOnly ? 'assets/admin-[hash].js' : 'assets/[name]-[hash].js';
        },
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
