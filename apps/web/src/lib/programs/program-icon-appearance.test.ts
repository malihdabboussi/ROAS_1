import { describe, expect, it } from 'vitest'
import {
  pickDefaultProgramColorId,
  PROGRAM_DEFAULT_COLOR_IDS,
  resolveProgramIconColorId,
} from './program-icon-appearance'

describe('program-icon-appearance', () => {
  it('picks a stable non-gray color from program id', () => {
    const a = pickDefaultProgramColorId('prog-clients')
    const b = pickDefaultProgramColorId('prog-clients')
    expect(a).toBe(b)
    expect(PROGRAM_DEFAULT_COLOR_IDS).toContain(a)
  })

  it('preserves explicit user-picked colors including default', () => {
    expect(resolveProgramIconColorId('prog-1', 'orange')).toBe('orange')
    expect(resolveProgramIconColorId('prog-1', 'default')).toBe('default')
  })

  it('fills missing icon_color from seed and mutes General', () => {
    expect(PROGRAM_DEFAULT_COLOR_IDS).toContain(resolveProgramIconColorId('prog-ops', null))
    expect(resolveProgramIconColorId(null, undefined)).toBe('muted')
  })
})
