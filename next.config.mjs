/** @type {import('next').NextConfig} */

import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  reactStrictMode: true,
  // lucide-react va supabase butun loyiha bo'ylab nomma-nom import qilingan.
  // Bu ularni bir-bir modulga bo'lib, dev-server va bundle'ni sezilarli tezlashtiradi
  // (funksionallik o'zgarmaydi — faqat import qilinadigan modullar soni kamayadi).
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },
  // Produksiyada console.* chaqiruvlarini olib tashlaydi (error/warn qoldiriladi).
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
}

export default withSerwist(nextConfig);
