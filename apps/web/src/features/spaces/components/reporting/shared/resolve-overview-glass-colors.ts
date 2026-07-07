import type { ReportingViewConfig } from '../../../types/space-schema'
import { presetToHex } from '../../cells/field-color-presets-popover'

const THEME_PRIMARY = 'var(--color-primary)'

function resolveToken(value: string | undefined, fallback: string): string {
  if (!value) return fallback
  if (
    value.startsWith('#') ||
    value.startsWith('linear-gradient') ||
    value.startsWith('rgb') ||
    value.startsWith('var(')
  ) {
    return value
  }
  return presetToHex(value)
}

/**
 * Resolves reporting view glass colors for CSS variables on the overview root.
 * Chain: primary ← overview_glass_primary ?? chart_color ?? theme; accents default to primary.
 */
export function getOverviewGlassCssVars(
  config: ReportingViewConfig | undefined,
): Record<string, string> {
  const fromChart = config?.chart_color
    ? resolveToken(config.chart_color, THEME_PRIMARY)
    : THEME_PRIMARY
  const primary = resolveToken(config?.overview_glass_primary, fromChart)
  const accent1 = resolveToken(config?.overview_glass_accent_1, primary)
  const accent2 = resolveToken(config?.overview_glass_accent_2, primary)
  return {
    '--overview-glass-primary': primary,
    '--overview-glass-accent-1': accent1,
    '--overview-glass-accent-2': accent2,
  }
}
