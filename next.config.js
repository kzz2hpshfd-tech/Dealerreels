/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }, // tighten to your CDN domain in production
    ],
  },
};

module.exports = nextConfig;
