import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // avoid PWA caching issues in dev
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost',       port: '8000', pathname: '/media/**' },
      { protocol: 'https', hostname: 'localhost',       port: '8000', pathname: '/media/**' },
      { protocol: 'http',  hostname: '*.railway.app',               pathname: '/media/**' },
      { protocol: 'https', hostname: '*.railway.app',               pathname: '/media/**' },
      { protocol: 'https', hostname: '*.mooreskillup.*',            pathname: '/media/**' },
    ],
  },
};

export default withPWA(nextConfig);