function isHex(color?: string): boolean {
  return typeof color === 'string' && color.startsWith('#')
}

function isGradient(color?: string): boolean {
  return typeof color === 'string' && color.startsWith('linear-gradient')
}

function isCustom(color?: string): boolean {
  return isHex(color) || isGradient(color)
}

const DOT_BG_BY_COLOR: Record<string, string> = {
  cyan: 'bg-cyan-500',
  amber: 'bg-amber-500',
  violet: 'bg-violet-500',
  emerald: 'bg-emerald-500',
  slate: 'bg-slate-500',
  blue: 'bg-blue-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  pink: 'bg-pink-500',
  rose: 'bg-rose-500',
  fuchsia: 'bg-fuchsia-500',
  purple: 'bg-purple-500',
  indigo: 'bg-indigo-500',
  sky: 'bg-sky-500',
  teal: 'bg-teal-500',
  green: 'bg-green-500',
  lime: 'bg-lime-500',
  yellow: 'bg-yellow-500',
}

const DOT_OUTLINE_BY_COLOR: Record<string, string> = {
  cyan: 'shadow-[0_0_0_1.5px_rgb(34_211_238/0.6)]',
  amber: 'shadow-[0_0_0_1.5px_rgb(251_191_36/0.6)]',
  violet: 'shadow-[0_0_0_1.5px_rgb(167_139_250/0.6)]',
  emerald: 'shadow-[0_0_0_1.5px_rgb(52_211_153/0.6)]',
  slate: 'shadow-[0_0_0_1.5px_rgb(148_163_184/0.6)]',
  blue: 'shadow-[0_0_0_1.5px_rgb(96_165_250/0.6)]',
  orange: 'shadow-[0_0_0_1.5px_rgb(251_146_60/0.6)]',
  red: 'shadow-[0_0_0_1.5px_rgb(248_113_113/0.6)]',
  pink: 'shadow-[0_0_0_1.5px_rgb(244_114_182/0.6)]',
  rose: 'shadow-[0_0_0_1.5px_rgb(251_113_133/0.6)]',
  fuchsia: 'shadow-[0_0_0_1.5px_rgb(232_121_249/0.6)]',
  purple: 'shadow-[0_0_0_1.5px_rgb(192_132_252/0.6)]',
  indigo: 'shadow-[0_0_0_1.5px_rgb(129_140_248/0.6)]',
  sky: 'shadow-[0_0_0_1.5px_rgb(56_189_248/0.6)]',
  teal: 'shadow-[0_0_0_1.5px_rgb(45_212_191/0.6)]',
  green: 'shadow-[0_0_0_1.5px_rgb(74_222_128/0.6)]',
  lime: 'shadow-[0_0_0_1.5px_rgb(163_230_53/0.6)]',
  yellow: 'shadow-[0_0_0_1.5px_rgb(250_204_21/0.6)]',
}

export function OptionDot({ color, size = 'md' }: { color?: string; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-[6px] w-[6px]' : 'h-2 w-2'
  const ring = size === 'sm' ? 'h-[10px] w-[10px]' : 'h-3 w-3'

  if (isCustom(color)) {
    const fallbackHex = isGradient(color)
      ? (color!.match(/#[0-9A-Fa-f]{6}/)?.[0] ?? '#888')
      : color!
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full ${ring} bg-transparent`}
        style={{ boxShadow: `0 0 0 1.5px ${fallbackHex}99` }}
      >
        <span className={`block rounded-full ${dim}`} style={{ background: color }} />
      </span>
    )
  }

  const bg = DOT_BG_BY_COLOR[color ?? ''] ?? 'bg-[var(--color-muted-foreground)]'
  const outline =
    DOT_OUTLINE_BY_COLOR[color ?? ''] ?? 'shadow-[0_0_0_1.5px_var(--color-muted-foreground)]'
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${ring} ${outline} bg-transparent`}
    >
      <span className={`block rounded-full ${dim} ${bg}`} />
    </span>
  )
}
