import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SidebarFavoritesFlyout } from './SidebarFavoritesFlyout'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))

describe('SidebarFavoritesFlyout', () => {
  it('opens ROAS actions instead of the browser menu on right-click', () => {
    const onToggleCampaignFavorite = vi.fn()
    render(
      <SidebarFavoritesFlyout
        favoritePrograms={[]}
        favoriteCampaigns={[
          {
            id: 'campaign-1',
            name: 'Personal',
            isFavorite: true,
          } as never,
        ]}
        favoriteSpaces={[]}
        onToggleCampaignFavorite={onToggleCampaignFavorite}
      />,
    )

    fireEvent.contextMenu(screen.getByRole('link', { name: 'Personal' }), {
      clientX: 40,
      clientY: 60,
    })

    expect(screen.getByRole('menu', { name: 'Personal actions' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open in new tab' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove from favorites' }))
    expect(onToggleCampaignFavorite).toHaveBeenCalledTimes(1)
  })
})
import type { ComponentProps } from 'react'
