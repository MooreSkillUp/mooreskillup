import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // avoid PWA caching issues in dev
  // Shown when a navigation fails with no network — better than the browser's
  // own error page, which makes the app look broken rather than offline.
  fallbacks: {
    document: '/offline',
  },
  runtimeCaching: [
    // Fonts and icons: they never change without a new filename.
    {
      urlPattern: /\.(?:woff2?|ttf|otf|eot)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'msu-fonts',
        expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
    // Course banners, avatars and certificates from Blob Storage. Uploads never
    // overwrite an existing name, so a cached image is never stale.
    {
      urlPattern: /^https:\/\/[a-z0-9]+\.blob\.core\.windows\.net\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'msu-media',
        expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'msu-images',
        expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    // The app shell. StaleWhileRevalidate means a warm launch paints instantly
    // and the new build is picked up in the background.
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'msu-static',
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      urlPattern: /\.(?:js|css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'msu-assets',
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
      },
    },
    // NOTE: API responses are deliberately NOT cached.
    //
    // Everything under /api/ is per-student and authenticated. A service worker
    // cache is shared by origin, not by user, so caching those responses would
    // let one account's dashboard, payments or certificates be served to whoever
    // signs in next on a shared phone. It would also show stale progress, which
    // is worse than a brief spinner on a screen whose whole job is being honest
    // about how far along you are.
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '8000', pathname: '/media/**' },
      { protocol: 'https', hostname: 'localhost', port: '8000', pathname: '/media/**' },
      // Uploads in production live in Azure Blob Storage. Without this, every
      // course banner and avatar fails to render behind next/image.
      { protocol: 'https', hostname: '*.blob.core.windows.net', pathname: '/**' },
      // The API itself, for anything still served from Django's /media/.
      { protocol: 'https', hostname: '*.azurecontainerapps.io', pathname: '/media/**' },
      { protocol: 'https', hostname: '*.mooreskillup.com', pathname: '/media/**' },
      { protocol: 'https', hostname: '*.mooreskillup.org', pathname: '/media/**' },
    ],
  },
};

export default withPWA(nextConfig);
