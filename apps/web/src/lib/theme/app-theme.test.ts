import { describe, expect, it } from 'vitest'
import { buildAppThemeBootScript } from './app-theme'

describe('buildAppThemeBootScript', () => {
  it('defaults to light when no preference is stored', () => {
    const script = buildAppThemeBootScript('vibey-app-theme')
    expect(script).toContain('vibey-app-theme')
    expect(script).toContain("s==='dark'")
    expect(script).toContain("colorScheme=useDark?'dark':'light'")
  })
})
