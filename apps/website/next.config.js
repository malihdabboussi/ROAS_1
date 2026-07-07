/** @type {import('next').NextConfig} */
const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    if (!appUrl) return []
    return [
      {
        source: '/login',
        destination: `${appUrl}/login`,
        permanent: true,
      },
      {
        source: '/signup',
        destination: `${appUrl}/invite`,
        permanent: true,
      },
      {
        source: '/app',
        destination: appUrl,
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
