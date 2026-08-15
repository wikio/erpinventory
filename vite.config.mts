import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const buildVersion = process.env.SARI_BUILD_VERSION || process.env.npm_package_version || '3';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.SARI_BACKEND_URL || 'http://127.0.0.1:3001',
        changeOrigin: false,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (asset) => {
          if (asset.names?.some((name) => /\.(woff2?|ttf)$/i.test(name))) return 'assets/fonts/[name]-[hash][extname]';
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  plugins: [
    VitePWA({
      strategies: 'generateSW',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false,
      includeAssets: ['assets/*.svg'],
      workbox: {
        cacheId: `sari-systeme-${buildVersion}`,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{html,js,css,json,svg,png,ico,woff,woff2}'],
        runtimeCaching: [
          {
            // Authentication and mutations are deliberately excluded from SW caching.
            urlPattern: /^https?:\/\/[^/]+\/api\/(?!auth\/|db\/config|integration\/tokens).*/i,
            method: 'GET',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: `sari-api-${buildVersion}`,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 80, maxAgeSeconds: 5 * 60, purgeOnQuotaError: true },
            },
          },
          {
            urlPattern: ({ request }) => ['style', 'script', 'font', 'image'].includes(request.destination),
            handler: 'CacheFirst',
            options: {
              cacheName: `sari-static-${buildVersion}`,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 180, maxAgeSeconds: 365 * 24 * 60 * 60, purgeOnQuotaError: true },
            },
          },
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: `sari-navigation-${buildVersion}`,
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
