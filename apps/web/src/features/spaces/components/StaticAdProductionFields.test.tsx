import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { StaticAdProductionKickoffFields } from './playbooks/static-ad-production'
import {
  EMPTY_STATIC_AD_FIELDS,
  isStaticAdProductionValid,
  StaticAdProductionFields,
} from './StaticAdProductionFields'

function Harness() {
  const [fields, setFields] = useState(EMPTY_STATIC_AD_FIELDS)
  return <StaticAdProductionFields fields={fields} onChange={setFields} />
}

describe('StaticAdProductionFields', () => {
  afterEach(cleanup)

  it('starts in the static-ad-book lane with write-for-me selected', () => {
    render(<Harness />)

    expect(screen.getByRole('button', { name: /Static ad book/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Write for me' })).toHaveClass('button-glass-primary')
    expect(screen.getByLabelText('Offer and audience context')).toBeInTheDocument()
  })

  it('multi-selects formats and defaults each selected format to one variation', () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: /^Chat receipt/i }))

    expect(screen.getByLabelText('Myth vs. system variations')).toHaveValue(1)
    expect(screen.getByLabelText('Chat receipt variations')).toHaveValue(1)
    expect(screen.getByText('Finished ads:')).toHaveTextContent('Finished ads: 2')

    fireEvent.change(screen.getByLabelText('Chat receipt variations'), {
      target: { value: '3' },
    })
    expect(screen.getByText('Finished ads:')).toHaveTextContent('Finished ads: 4')
  })

  it('expands one exact-copy field for every requested variation', () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: 'Use my exact copy' }))
    fireEvent.change(screen.getByLabelText('Myth vs. system variations'), {
      target: { value: '2' },
    })

    expect(screen.getByLabelText('Myth vs. system — variation 1 exact copy')).toBeInTheDocument()
    expect(screen.getByLabelText('Myth vs. system — variation 2 exact copy')).toBeInTheDocument()
  })

  it('supports validate-messaging and image-brief production lanes', () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: /Validate messaging angles/i }))
    expect(screen.getByLabelText('Finished ads')).toHaveValue(1)

    fireEvent.click(screen.getByRole('button', { name: /Image brief/i }))
    expect(screen.getByLabelText('Finished ads')).toHaveValue(1)
  })

  it('requires every exact-copy variation before allowing launch', () => {
    const fields: StaticAdProductionKickoffFields = {
      ...EMPTY_STATIC_AD_FIELDS,
      copyMode: 'use_my_copy',
      formatVariationCounts: { myth_vs_system: 2 },
      exactCopyBySelection: { myth_vs_system: ['Ready', ''] },
    }
    expect(isStaticAdProductionValid(fields)).toBe(false)
    expect(
      isStaticAdProductionValid({
        ...fields,
        exactCopyBySelection: { myth_vs_system: ['Ready', 'Also ready'] },
      }),
    ).toBe(true)
  })
})
