const path = require('path');

const nextConfig = {
  output: 'standalone',
  // Pin the workspace root; a stray lockfile in the home directory otherwise
  // makes Next trace files from there.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com', pathname: '/**' },
    ],
  },
  // Renamed from experimental.serverComponentsExternalPackages in Next 15
  serverExternalPackages: ['mongodb'],
  webpack(config, { dev }) {
    if (dev) {
      config.watchOptions = {
        aggregateTimeout: 300,
        // The local mongod writes into .devdata continuously; watching it sends
        // the dev server into a permanent rebuild loop.
        ignored: ['**/node_modules/**', '**/.devdata/**', '**/.next/**', '**/apps/**'],
      };
    }
    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  async headers() {
    // CORS for /api is handled per-request in the route handler, which echoes
    // back only allowlisted origins — a wildcard here would break credentialed
    // cookie auth and re-open the API to any site.
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self';" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
