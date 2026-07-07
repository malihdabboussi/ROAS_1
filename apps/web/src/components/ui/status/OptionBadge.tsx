import type { CSSProperties } from 'react'
import type { SelectOption } from '@/lib/spaces/space-schema-types'
export { OptionDot } from './OptionDot'

function isHex(color?: string): boolean {
  return typeof color === 'string' && color.startsWith('#')
}

function isGradient(color?: string): boolean {
  return typeof color === 'string' && color.startsWith('linear-gradient')
}

function isCustom(color?: string): boolean {
  return isHex(color) || isGradient(color)
}

const OPTION_STYLE_BY_COLOR: Record<string, string> = {
  cyan: 'bg-cyan-500/20 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
  amber: 'bg-amber-500/20 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  violet: 'bg-violet-500/20 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  emerald: 'bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  slate: 'bg-slate-500/20 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
  blue: 'bg-blue-500/20 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  orange: 'bg-orange-500/20 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  red: 'bg-red-500/20 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  pink: 'bg-pink-500/20 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
  rose: 'bg-rose-500/20 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  fuchsia: 'bg-fuchsia-500/20 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
  purple: 'bg-purple-500/20 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  indigo: 'bg-indigo-500/20 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  sky: 'bg-sky-500/20 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  teal: 'bg-teal-500/20 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  green: 'bg-green-500/20 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  lime: 'bg-lime-500/20 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300',
  yellow: 'bg-yellow-500/20 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300',
}

function getOptionStyle(color?: string): string {
  if (isCustom(color)) return ''
  return OPTION_STYLE_BY_COLOR[color ?? ''] ?? 'bg-[var(--color-muted)]/30 text-[var(--foreground)]'
}

function customBadgeStyle(color: string): CSSProperties {
  if (isGradient(color)) {
    return { background: color, color: '#fff', WebkitBackgroundClip: 'padding-box' }
  }
  return { backgroundColor: `${color}2b`, color }
}

interface OptionBadgeProps {
  option: Pick<SelectOption, 'label' | 'color'>
}

export function OptionBadge({ option }: OptionBadgeProps) {
  const cls = getOptionStyle(option.color)
  const style = isCustom(option.color) ? customBadgeStyle(option.color!) : undefined
  return (
    <span
      className={`inline-flex items-center rounded-full border border-current/20 px-2 py-0.5 text-xs font-semibold ${cls}`}
      style={style}
    >
      {option.label}
    </span>
  )
}
