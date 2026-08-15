import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { COMPOSER_TRY_TIP_MESSAGES } from '@/lib/chat/composer-try-tips'
import { ComposerTryTipBanner } from './ComposerTryTipBanner'

describe('ComposerTryTipBanner', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows the tip and reports Try as opening a new task', async () => {
    const onTry = vi.fn()
    const onDismiss = vi.fn()
    render(
      <ComposerTryTipBanner
        body="Building a slide deck? Attach your source material and a brief."
        onTry={onTry}
        onDismiss={onDismiss}
      />,
    )

    expect(screen.getByText(COMPOSER_TRY_TIP_MESSAGES.badge)).toBeInTheDocument()
    expect(screen.getByText(/slide deck/i)).toBeInTheDocument()

    const tryButton = screen.getByRole('button', { name: COMPOSER_TRY_TIP_MESSAGES.try })
    fireEvent.mouseEnter(tryButton.parentElement!)
    expect(await screen.findByText(COMPOSER_TRY_TIP_MESSAGES.tryTooltip)).toBeInTheDocument()
    fireEvent.click(tryButton)
    expect(onTry).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: COMPOSER_TRY_TIP_MESSAGES.dismiss }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
