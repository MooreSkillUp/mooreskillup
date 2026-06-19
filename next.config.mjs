/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Type errors fail the build on purpose: broken code must not reach production.
  // ESLint stays advisory for now (run `npm run lint` locally); it will be
  // promoted to build-blocking once legacy warnings are cleared.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
