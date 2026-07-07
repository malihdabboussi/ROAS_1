import type { Theme } from '@/lib/themes/theme-types'

export function buildThemePreviewCss(theme: Theme): string {
  const vars: Array<[string, string | null | undefined]> = [
    ['--color-primary', theme.colors.primary],
    ['--color-primary-foreground', theme.colors.primaryForeground],
    ['--color-secondary', theme.colors.secondaryAccent1],
    ['--color-accent', theme.colors.secondaryAccent2],
    ['--color-foreground', theme.colors.heading],
    ['--color-muted-foreground', theme.colors.body],
    ['--color-background', theme.colors.pageBackground],
    ['--color-card', theme.colors.cardBackground],
    ['--color-border', theme.colors.border],
    ['--color-input', theme.colors.input],
    ['--color-success', theme.colors.success],
    ['--color-warning', theme.colors.warning],
    ['--color-danger', theme.colors.danger],
    ['--font-heading', theme.font_heading],
    ['--font-body', theme.font_body],
  ]

  const body = vars
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n')

  if (!body) return ''
  return `:root {\n${body}\n}`
}
