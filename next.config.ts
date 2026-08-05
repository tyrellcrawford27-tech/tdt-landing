import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // The city dataset is content-addressed by filename: regenerating it means
        // bumping the version in the name AND in CITIES_URL in lib/cities.ts.
        // Safe to cache forever because the URL changes whenever the bytes do.
        source: '/cities-v1.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
