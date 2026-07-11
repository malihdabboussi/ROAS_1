import { Profiler } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FeatureUpdateMockup } from './FeatureUpdateMockups'

describe('FeatureUpdateMockup', () => {
  afterEach(() => {
    cleanup()
  })

  it('routes update titles to the matching miniature mockup', () => {
    const { rerender } = render(<FeatureUpdateMockup title="Team workspace improvements" />)
    expect(screen.getByText('Strategist')).toBeInTheDocument()
    expect(screen.getByText('Funnel')).toBeInTheDocument()

    rerender(<FeatureUpdateMockup title="Skill marketplace launch" />)
    expect(screen.getByText('Website Builder')).toBeInTheDocument()

    rerender(<FeatureUpdateMockup title="Brain knowledge graph" />)
    expect(screen.getByText('vibey.im/brain')).toBeInTheDocument()

    rerender(<FeatureUpdateMockup title="Organization switching" />)
    expect(screen.getByText('roas.io/org')).toBeInTheDocument()
    expect(screen.getByText('Growth')).toBeInTheDocument()

    rerender(<FeatureUpdateMockup title="Campaign timeline" />)
    expect(screen.getByText('SaaS Launch')).toBeInTheDocument()

    rerender(<FeatureUpdateMockup title="Mission control progress" />)
    expect(screen.getByText('Q2 Landing')).toBeInTheDocument()

    rerender(<FeatureUpdateMockup title="General platform polish" />)
    expect(screen.getByText('vibey.im')).toBeInTheDocument()
  })

  it('settles after rerender without repeated render churn', async () => {
    let commits = 0

    const { rerender } = render(
      <Profiler id="feature-update-mockup" onRender={() => (commits += 1)}>
        <FeatureUpdateMockup title="Team workspace improvements" />
      </Profiler>,
    )

    rerender(
      <Profiler id="feature-update-mockup" onRender={() => (commits += 1)}>
        <FeatureUpdateMockup title="Mission control progress" />
      </Profiler>,
    )

    await waitFor(() => expect(commits).toBeLessThan(8))
  })
})
