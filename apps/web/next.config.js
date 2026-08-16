const path = require('path')

/** Pre-bundled ESM: package exports block `pagedjs/dist/...`; aliasing `pagedjs` avoids broken src+event-emitter in Turbopack. */
const pagedjsBundle = path.join(__dirname, 'node_modules/pagedjs/dist/paged.esm.js')
const pagedjsBundleForTurbo = './node_modules/pagedjs/dist/paged.esm.js'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  transpilePackages: ['@vibey/ui', '@vibey/db'],
  serverExternalPackages: ['@turbodocx/html-to-docx', 'sharp'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lhfgtsjetcardinpgouq.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'mjaxhuehopzbsuhmseeg.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  turbopack: {
    resolveAlias: {
      pagedjs: pagedjsBundleForTurbo,
    },
  },
  async rewrites() {
    return [
      {
        source: '/apple-touch-icon.png',
        destination: '/Logos/logov2/icon-white.png',
      },
      {
        source: '/apple-touch-icon-precomposed.png',
        destination: '/Logos/logov2/icon-white.png',
      },
    ]
  },
  async redirects() {
    return [
      { source: '/team-2', destination: '/team', permanent: true },
      { source: '/team-2/:path*', destination: '/team/:path*', permanent: true },
    ]
  },
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      if (!dev && process.env.VERCEL) config.devtool = false
      const webpack = require('webpack')
      config.resolve = config.resolve || {}
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        pagedjs: pagedjsBundle,
        fs: false,
        https: false,
        os: false,
        path: false,
        express: false,
        'image-size': false,
        'node:fs': false,
        'node:https': false,
      }
      config.plugins = config.plugins || []
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '')
        }),
      )
    }
    return config
  },
  experimental: {
    // Turbopack FS cache compaction was blocking dev for minutes on this monorepo.
    turbopackFileSystemCacheForDev: false,
    optimizePackageImports: ['react-icons', 'lucide-react', 'date-fns'],
    serverActions: {
      bodySizeLimit: '1100mb',
    },
    proxyClientMaxBodySize: '1100mb',
  },
}

module.exports = nextConfig
