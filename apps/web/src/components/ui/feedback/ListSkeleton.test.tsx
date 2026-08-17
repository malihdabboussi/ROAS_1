import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ListSkeleton } from './ListSkeleton'

describe('ListSkeleton', () => {
  afterEach(cleanup)

  it('exposes the loading label as a status region', () => {
    render(<ListSkeleton rows={4} label="Loading meetings..." />)

    expect(screen.getByRole('status', { name: 'Loading meetings...' })).toBeInTheDocument()
  })
})
