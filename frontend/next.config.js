/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Same-origin API: browser hamesha RELATIVE /api/* mangta hai (koi IP hardcode nahi).
  // Next server-side backend pe forward karta hai — docker me backend:4000, local me localhost:4000.
  async rewrites() {
    const target = process.env.BACKEND_INTERNAL_URL || "http://localhost:4000";
    return [{ source: "/api/:path*", destination: `${target}/api/:path*` }];
  },
};
module.exports = nextConfig;
