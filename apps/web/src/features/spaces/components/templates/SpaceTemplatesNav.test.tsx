import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpaceTemplatesNav } from './SpaceTemplatesNav'

describe('SpaceTemplatesNav', () => {
  afterEach(() => cleanup())

  it('uses a horizontal mobile strip and restores the desktop rail', () => {
    render(
      <SpaceTemplatesNav templateNavFilter="all" onTemplateNavFilter={vi.fn()} templates={[]} />,
    )

    const navigation = screen.getByRole('complementary')
    const allTemplates = screen.getByRole('button', { name: 'All templates 0' })

    expect(navigation).toHaveClass('h-auto', 'md:h-full')
    expect(navigation.firstElementChild).toHaveClass('flex-row', 'overflow-x-auto', 'md:flex-col')
    expect(allTemplates).toHaveClass('w-max', 'shrink-0', 'md:w-full')
  })
})
