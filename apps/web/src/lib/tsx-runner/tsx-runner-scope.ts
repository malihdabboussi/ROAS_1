import * as React from 'react'
import * as AnimeJs from 'animejs'
import * as FramerMotion from 'framer-motion'
import * as LucideReact from 'lucide-react'
import * as Recharts from 'recharts'

type ScopeShape = Record<string, unknown>

/**
 * Shared scope for react-runner TSX execution.
 * Supports regular JSX + common generated imports.
 */
export function createTsxRunnerScope(extraScope?: ScopeShape): ScopeShape {
  return {
    React,
    ...React,
    ...FramerMotion,
    ...LucideReact,
    ...Recharts,
    animejs: AnimeJs,
    render: (el: unknown) => el,
    import: {
      react: React,
      React,
      'lucide-react': LucideReact,
      'framer-motion': FramerMotion,
      animejs: AnimeJs,
      recharts: Recharts,
    },
    ...(extraScope ?? {}),
  }
}
