import { describe, expect, it } from 'vitest'
import { programDisplayName } from './program-display-name'

describe('programDisplayName', () => {
  it('relabels the system clients Program so it is not interchangeable with agency Clients', () => {
    expect(programDisplayName({ name: 'Clients', system_kind: 'clients' })).toBe('Client Spaces')
  })

  it('keeps operator-authored and other system Program names', () => {
    expect(programDisplayName({ name: 'ROAS Ops', system_kind: 'roas_ops' })).toBe('ROAS Ops')
    expect(programDisplayName({ name: 'Personal', system_kind: 'personal' })).toBe('Personal')
    expect(programDisplayName({ name: 'Launch', system_kind: null })).toBe('Launch')
  })
})
