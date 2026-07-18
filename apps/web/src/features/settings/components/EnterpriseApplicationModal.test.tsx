import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EnterpriseApplicationModal } from './EnterpriseApplicationModal'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
  }),
}))

describe('EnterpriseApplicationModal', () => {
  it('names and describes the dialog and every application field', () => {
    render(<EnterpriseApplicationModal open onClose={vi.fn()} onSuccess={vi.fn()} />)

    expect(
      screen.getByRole('dialog', { name: 'Enterprise Application' }),
    ).toHaveAccessibleDescription('Tell us about your company and how your team plans to use ROAS.')
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
    expect(screen.getByLabelText('Email')).toBeTruthy()
    expect(screen.getByLabelText('Full name')).toBeTruthy()
    expect(screen.getByLabelText(/Company name/)).toBeRequired()
    expect(screen.getByLabelText(/Company size/)).toBeRequired()
    expect(screen.getByLabelText('Role / Job title')).toBeTruthy()
    expect(screen.getByLabelText('How do you plan to use ROAS?')).toBeTruthy()
    expect(screen.getByLabelText('How many team members?')).toBeTruthy()
    expect(screen.getByLabelText('Phone number')).toBeTruthy()
    expect(screen.getByLabelText('Company website')).toBeTruthy()
  })
})
