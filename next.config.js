/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@supabase/supabase-js'],
  turbopack: {
    root: __dirname,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
