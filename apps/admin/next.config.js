const path = require('path')

const webSrc = path.resolve(__dirname, '../web/src')
const adminSrc = path.resolve(__dirname, 'src')

function adminPath(...segments) {
  return path.join(adminSrc, ...segments)
}

const adminFeatureModules = [
  'enterprise-tools',
  'dev-dashboard',
  'traces',
  'dashboard',
  'finances',
  'users',
  'waitlist',
  'instruction-governance',
  'mission-reliability',
  'enterprise-applications',
  'platform-email',
]

function buildResolveAliases() {
  const alias = {}

  alias['@web'] = webSrc

  alias['@/lib/supabase'] = adminPath('lib/supabase')
  alias['@/lib/api/admin-client'] = adminPath('lib/api/admin-client.ts')
  alias['@/lib/utils/cn'] = adminPath('lib/utils/cn.ts')
  alias['@/lib/format-agent-key-display'] = adminPath('lib/format-agent-key-display.ts')
  alias['@/lib/use-self-healing-preview'] = adminPath('lib/use-self-healing-preview.ts')
  alias['@/lib/esbuild-transform'] = adminPath('lib/esbuild-transform.ts')
  alias['@/lib'] = path.join(webSrc, 'lib')

  alias['@/components/ui/card'] = adminPath('components/ui/card.tsx')
  alias['@/components/ui/chart'] = adminPath('components/ui/chart.tsx')
  alias['@/components/ui/tabs'] = adminPath('components/ui/tabs.tsx')
  alias['@/components/layout'] = adminPath('components/layout')
  alias['@/components/admin'] = adminPath('components/admin')
  alias['@/components/vibey/vibey-loading-orb'] = adminPath('components/vibey/vibey-loading-orb.tsx')
  alias['@/components/vibey/vibey-chat-orb'] = adminPath('components/vibey/vibey-chat-orb.tsx')
  alias['@/components'] = path.join(webSrc, 'components')

  alias['@/app'] = path.join(webSrc, 'app')

  alias['@/hooks/use-esbuild-runner'] = adminPath('hooks/use-esbuild-runner.ts')
  alias['@/hooks'] = path.join(webSrc, 'hooks')

  for (const feature of adminFeatureModules) {
    alias[`@/features/${feature}`] = adminPath('features', feature)
  }
  alias['@/features'] = path.join(webSrc, 'features')
  alias['@/features/studio'] = path.join(webSrc, 'features/studio')
  alias['@/features/spaces'] = path.join(webSrc, 'features/spaces')
  alias['@/features/settings'] = path.join(webSrc, 'features/settings')
  alias['@/features/org'] = path.join(webSrc, 'features/org')
  alias['@/features/team'] = path.join(webSrc, 'features/team')
  alias['@/features/mission-control'] = path.join(webSrc, 'features/mission-control')
  alias['@/features/projects'] = path.join(webSrc, 'features/projects')
  alias['@/features/agent-teams'] = path.join(webSrc, 'features/agent-teams')

  alias['pptxgenjs'] = adminPath('features/enterprise-tools/shims/empty-module.js')

  return alias
}

const resolveAliases = buildResolveAliases()

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { externalDir: true },
  turbopack: {
    resolveAlias: {
      ...resolveAliases,
      pptxgenjs: './src/features/enterprise-tools/shims/empty-module.js',
    },
  },
  webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) config.devtool = 'hidden-source-map'
    config.resolve.alias = { ...(config.resolve.alias ?? {}), ...resolveAliases }
    config.resolve.fallback = {
      ...(config.resolve.fallback ?? {}),
      fs: false,
      https: false,
      http: false,
      path: false,
    }
    return config
  },
}

module.exports = nextConfig
