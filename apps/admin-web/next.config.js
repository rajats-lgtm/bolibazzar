const apiOrigin = process.env.ADMIN_API_ORIGIN || 'http://localhost:3000';

module.exports = {
  output: 'standalone',
  async rewrites() {
    return [{
      source: '/api/:path*',
      destination: `${apiOrigin}/api/:path*`,
    }];
  },
};