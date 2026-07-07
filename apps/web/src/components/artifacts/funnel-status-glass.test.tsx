import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  FunnelStatusGlassCapsule,
  funnelStatusDisplayLabel,
  funnelStatusGlassClass,
} from './funnel-status-glass'

describe('shared funnel-status-glass', () => {
  afterEach(() => {
    cleanup()
  })

  it('maps funnel statuses to glass badge classes', () => {
    expect(funnelStatusGlassClass(' published ')).toBe('badge-glass-green')
    expect(funnelStatusGlassClass('generated')).toBe('badge-glass-blue')
    expect(funnelStatusGlassClass('paused')).toBe('badge-glass-orange')
    expect(funnelStatusGlassClass('archived')).toBe('badge-glass-red')
    expect(funnelStatusGlassClass('draft')).toBe('badge-glass-muted')
  })

  it('normalizes funnel status labels', () => {
    expect(funnelStatusDisplayLabel('')).toBe('Draft')
    expect(funnelStatusDisplayLabel(' published ')).toBe('Published')
  })

  it('renders an accessible status capsule for toolbar usage', () => {
    render(<FunnelStatusGlassCapsule status="published" hoverVariant="funnel-toolbar" />)

    expect(screen.getByLabelText('Status Published').textContent).toBe('Published')
  })
})
