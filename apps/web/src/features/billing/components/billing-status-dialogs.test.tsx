import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CreditDepletedDialog } from './CreditDepletedDialog'
import { CreditPurchaseSuccessDialog } from './CreditPurchaseSuccessDialog'
import { LimitReachedDialog } from './LimitReachedDialog'
import { PlanUpgradeSuccessDialog } from './PlanUpgradeSuccessDialog'

afterEach(cleanup)

describe('billing status dialogs', () => {
  it('exposes the plan upgrade success message as a dismissible dialog', async () => {
    const onClose = vi.fn()
    render(<PlanUpgradeSuccessDialog open onClose={onClose} planName="Pro" />)

    expect(screen.getByRole('dialog', { name: 'WELCOME TO PRO!' })).toHaveAccessibleDescription(
      'Your plan has been upgraded successfully',
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('exposes the credit purchase confirmation as a dismissible dialog', async () => {
    const onClose = vi.fn()
    render(
      <CreditPurchaseSuccessDialog
        open
        onClose={onClose}
        previousCredits={10}
        currentCredits={20}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Credits Added!' })).toHaveAccessibleDescription(
      'Your credit balance has been updated',
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('exposes plan limits as a dismissible dialog', async () => {
    const onClose = vi.fn()
    render(
      <LimitReachedDialog
        open
        onClose={onClose}
        onUpgrade={vi.fn()}
        resourceName="Campaign"
        currentCount={3}
        maxAllowed={3}
        planName="Starter"
      />,
    )

    expect(screen.getByRole('dialog', { name: 'CAMPAIGN LIMIT REACHED' })).not.toBeNull()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('exposes depleted credits as a dismissible dialog', async () => {
    const onClose = vi.fn()
    render(
      <CreditDepletedDialog
        open
        onClose={onClose}
        onBuyCredits={vi.fn()}
        onUpgrade={vi.fn()}
        isFreeUser={false}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'CREDITS DEPLETED' })).not.toBeNull()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})
