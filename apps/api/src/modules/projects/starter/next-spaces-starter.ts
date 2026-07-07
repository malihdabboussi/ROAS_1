import * as fs from 'node:fs'
import * as path from 'node:path'

/** Bump when starter files or lockfile change; keep in sync with Modal template rebuild (see scripts/modal-build-project-template.ts). */
export const STARTER_VERSION = 'spaces-next-2026-04-16-bundle'

const PACKAGE_JSON = `{
  "name": "vibey-spaces-app",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@hookform/resolvers": "5.0.1",
    "class-variance-authority": "0.7.1",
    "clsx": "2.1.1",
    "date-fns": "4.1.0",
    "framer-motion": "12.7.4",
    "lucide-react": "0.487.0",
    "next": "15.3.2",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-hook-form": "7.55.0",
    "recharts": "2.15.3",
    "tailwind-merge": "3.2.0",
    "zod": "3.24.2",
    "zustand": "5.0.3"
  },
  "devDependencies": {
    "@types/node": "22.15.3",
    "@types/react": "19.1.2",
    "@types/react-dom": "19.1.2",
    "autoprefixer": "10.4.21",
    "eslint": "9.24.0",
    "eslint-config-next": "15.3.2",
    "postcss": "8.5.3",
    "tailwindcss": "3.4.17",
    "typescript": "5.8.3"
  }
}
`

const ESLINTRC_JSON = `{
  "extends": "next/core-web-vitals"
}
`

const POSTCSS_CONFIG_MJS = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`

const TAILWIND_CONFIG_TS = `import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx,js,jsx,mdx}',
    './components/**/*.{ts,tsx,js,jsx,mdx}',
    './lib/**/*.{ts,tsx,js,jsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-foreground': 'var(--color-primary-foreground)',
        foreground: 'var(--color-foreground)',
        'muted-foreground': 'var(--color-muted-foreground)',
        background: 'var(--color-background)',
        card: 'var(--color-card-background)',
        border: 'var(--color-border)',
        input: 'var(--color-input)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
      },
      fontFamily: {
        heading: 'var(--font-heading)',
        body: 'var(--font-body)',
      },
    },
  },
  plugins: [],
}

export default config
`

const LIB_UTILS_TS = `import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge class names with Tailwind conflict resolution.
 * Standard pattern for composable components.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`

const NEXT_CONFIG_MJS = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

export default nextConfig
`

const TSCONFIG_JSON = `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
`

const NEXT_ENV_D_TS = `/// <reference types="next" />
/// <reference types="next/image-types/global" />
`

const APP_LAYOUT_TSX = `import type { Metadata } from 'next'
import './globals.css'
import './theme.css'

export const metadata: Metadata = {
  title: 'Vibey Space',
  description: 'Built with Vibey',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`

const APP_PAGE_TSX = `export default function Page() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-semibold">Your Space</h1>
      <p className="mt-2 text-muted-foreground">Tell Viktor what to build next.</p>
    </main>
  )
}
`

const APP_GLOBALS_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    margin: 0;
    font-family: var(--font-body, system-ui, sans-serif);
    color: var(--color-foreground, #161616);
    background-color: var(--color-background, #FAF9F6);
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading, inherit);
  }
}
`

const APP_THEME_CSS = `:root {
  --color-primary: #10B981;
  --color-primary-foreground: #000000;
  --color-primary-light: #34D399;
  --color-primary-dark: #059669;
  --color-foreground: #161616;
  --color-muted-foreground: #666666;
  --color-background: #FAF9F6;
  --color-card-background: #FFFFFF;
  --color-border: #E5E5E5;
  --color-input: #F2F2F2;
  --color-success: #34C759;
  --color-warning: #FF9500;
  --color-danger: #EF4444;
  --color-secondary-accent-1: #7AF0FF;
  --color-secondary-accent-2: #120336;
  --font-heading: system-ui, sans-serif;
  --font-body: system-ui, sans-serif;
}
`

const GITIGNORE = `node_modules/
.next/
.vibey-kit/
`

function readPnpmLockYaml(): string {
  const lockPath = path.join(__dirname, 'pnpm-lock.yaml')
  return fs.readFileSync(lockPath, 'utf8')
}

export type StarterFile = { path: string; content: string }

export function getNextSpacesStarterFiles(): StarterFile[] {
  return [
    { path: 'package.json', content: PACKAGE_JSON },
    { path: 'pnpm-lock.yaml', content: readPnpmLockYaml() },
    { path: 'next.config.mjs', content: NEXT_CONFIG_MJS },
    { path: 'tsconfig.json', content: TSCONFIG_JSON },
    { path: '.eslintrc.json', content: ESLINTRC_JSON },
    { path: 'postcss.config.mjs', content: POSTCSS_CONFIG_MJS },
    { path: 'tailwind.config.ts', content: TAILWIND_CONFIG_TS },
    { path: 'next-env.d.ts', content: NEXT_ENV_D_TS },
    { path: 'app/layout.tsx', content: APP_LAYOUT_TSX },
    { path: 'app/page.tsx', content: APP_PAGE_TSX },
    { path: 'app/globals.css', content: APP_GLOBALS_CSS },
    { path: 'app/theme.css', content: APP_THEME_CSS },
    { path: 'lib/utils.ts', content: LIB_UTILS_TS },
    { path: '.gitignore', content: GITIGNORE },
  ]
}

export function getNextSpacesStarterPackageJson(): string {
  return PACKAGE_JSON
}
