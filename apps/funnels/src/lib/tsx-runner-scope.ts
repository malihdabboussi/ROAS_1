import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import * as AnimeJs from 'animejs'
import { cva } from 'class-variance-authority'
import * as FramerMotion from 'framer-motion'
import * as LucideReact from 'lucide-react'
import { cn } from './utils'

type ScopeShape = Record<string, unknown>

let _THREE: Record<string, unknown> | null = null
let _Shaders: Record<string, unknown> | null = null

export async function preloadHeavyLibs(): Promise<void> {
  const [three, shaders] = await Promise.all([
    import('three'),
    import('@paper-design/shaders-react'),
  ])
  _THREE = three as unknown as Record<string, unknown>
  _Shaders = shaders as unknown as Record<string, unknown>
}

export function createTsxRunnerScope(extraScope?: ScopeShape): ScopeShape {
  return {
    React,
    ...React,
    ...FramerMotion,
    ...LucideReact,
    animejs: AnimeJs,
    cn,
    cva,
    Slot,
    FramerMotion,
    render: (el: unknown) => el,
    ...(_THREE ? { THREE: _THREE } : {}),
    ...(_Shaders ? { Shaders: _Shaders, ..._Shaders } : {}),
    import: {
      react: React,
      'lucide-react': LucideReact,
      'framer-motion': FramerMotion,
      animejs: AnimeJs,
      ...(_THREE ? { three: _THREE } : {}),
      ...(_Shaders ? { '@paper-design/shaders-react': _Shaders } : {}),
    },
    ...(extraScope ?? {}),
  }
}
