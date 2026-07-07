export function getSandpackThemeFromCss(): Record<string, unknown> {
  if (typeof document === 'undefined') return {}
  const root = document.documentElement
  const get = (varName: string) =>
    getComputedStyle(root).getPropertyValue(varName).trim() || undefined
  const bg = get('--color-background')
  const card = get('--color-card')
  const secondary = get('--color-secondary')
  const fg = get('--color-foreground')
  const mutedFg = get('--color-muted-foreground')
  const primary = get('--color-primary')
  const destructive = get('--color-destructive')
  const fontHeading = get('--font-heading')
  return {
    colors: {
      surface1: bg,
      surface2: card,
      surface3: secondary,
      clickable: mutedFg,
      base: fg,
      disabled: mutedFg,
      hover: fg,
      accent: primary,
      error: destructive,
      errorSurface: secondary,
    },
    syntax: {
      plain: fg,
      comment: { color: mutedFg, fontStyle: 'italic' as const },
      keyword: primary,
      tag: mutedFg,
      punctuation: mutedFg,
      definition: primary,
      property: mutedFg,
      static: mutedFg,
      string: primary,
    },
    font: {
      body: fontHeading || '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      mono: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
      size: '13px',
      lineHeight: '1.6',
    },
  }
}
