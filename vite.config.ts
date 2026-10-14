import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import ttsHandler from './api/tts';

/**
 * Yerel geliştirme/önizleme: /api/tts isteklerini Vercel'deki fonksiyonun aynısıyla karşılar.
 * Anahtar .env.local dosyasından okunur ve tarayıcıya hiçbir zaman gönderilmez.
 */
function localApi(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '');
  for (const k of ['AZURE_SPEECH_KEY', 'AZURE_SPEECH_REGION', 'AZURE_SPEECH_ENDPOINT']) {
    if (env[k] && !process.env[k]) process.env[k] = env[k];
  }
  const mw = async (req: any, res: any, next: any) => {
    if (!req.url || !req.url.startsWith('/api/tts')) return next();
    try {
      const headers = new Headers();
      for (const h of ['referer', 'origin', 'sec-fetch-site', 'x-forwarded-for']) if (req.headers[h]) headers.set(h, String(req.headers[h]));
      const r = await ttsHandler(new Request('http://' + req.headers.host + req.url, { method: req.method, headers }));
      res.statusCode = r.status;
      r.headers.forEach((v: string, k: string) => res.setHeader(k, v));
      res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e) {
      res.statusCode = 500;
      res.end('tts error');
    }
  };
  return {
    name: 'local-api-tts',
    configureServer(server) {
      server.middlewares.use(mw);
    },
    configurePreviewServer(server) {
      server.middlewares.use(mw);
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    localApi(mode),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.json',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Selim City – Okuma Macerası',
        short_name: 'Selim City',
        description: 'Hece ve kelime okumayı oyunla öğreten Türkçe macera oyunu.',
        lang: 'tr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'any',
        background_color: '#9FD8FF',
        theme_color: '#1B1F3B',
        categories: ['education', 'kids', 'games'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Uygulama kabuğu, JS/CSS, fontlar ve simgeler önbelleğe alınır: internet olmadan da açılır.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2,json}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        // Ses dosyaları kurulumda indirilmez; ilk kullanımda önbelleğe alınır (en fazla 40 dosya, 180 gün).
        globIgnores: ['**/*.woff', 'audio/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/audio/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'selim-audio',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  build: {
    target: ['es2020', 'safari15'],
    chunkSizeWarningLimit: 1600,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'], react: ['react', 'react-dom'] },
      },
    },
  },
}));
