import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MissionDeliverable, MissionSubtask } from '../../types'
import { HumanGateReviewPanel } from './HumanGateReviewPanel'

afterEach(cleanup)

const gate = {
  id: 'gate-creative',
  title: 'Gate 4 — approve creative assets',
  status: 'awaiting_human',
  assignee_type: 'human',
  depends_on: ['generate-images'],
  intent: {
    story: 'Review the creative package.',
    endState: 'Approved creative can move into ads.',
  },
} as MissionSubtask

const image = {
  id: 'image-1',
  mission_id: 'mission-1',
  user_id: 'user-1',
  agent_key: 'lux',
  type: 'image',
  title: 'Generated image',
  content: null,
  file_url: 'https://example.com/generated.png',
  file_name: 'generated.png',
  file_size: 1024,
  mime_type: 'image/png',
  metadata: {},
  created_at: '2026-07-19T18:00:00.000Z',
} satisfies MissionDeliverable

const document = {
  ...image,
  id: 'doc-1',
  type: 'doc',
  title: 'Copy Package',
  file_url: null,
  file_name: null,
  mime_type: null,
} satisfies MissionDeliverable

describe('HumanGateReviewPanel', () => {
  it('shows numbered visual previews and clickable document deliverables', () => {
    const onSelectDeliverable = vi.fn()

    render(
      <HumanGateReviewPanel
        subtask={gate}
        dependencies={[]}
        agents={[]}
        userProfile={{ fullName: 'Dylan', avatarUrl: null }}
        deliverables={[
          { ...image, metadata: { prompt: 'A ladder meeting a bright yellow ceiling.' } },
          document,
        ]}
        resourceLinks={[{ url: 'https://example.com/generated.png', label: 'Generated image' }]}
        feedback=""
        approving={false}
        sendingFeedback={false}
        onRequestChanges={vi.fn()}
        onApprove={vi.fn()}
        onSelectDeliverable={onSelectDeliverable}
        compact
      />,
    )

    expect(screen.getByRole('img', { name: 'Image 1 — Generated image' })).toBeInTheDocument()
    expect(
      screen.getByText('Prompt: A ladder meeting a bright yellow ceiling.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Generated image' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open Image 1 — Generated image' }))
    expect(onSelectDeliverable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: image.id,
        metadata: { prompt: 'A ladder meeting a bright yellow ceiling.' },
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Copy Package' }))
    expect(onSelectDeliverable).toHaveBeenCalledWith(document)
  })

  it('uses the activity composer as the only feedback input', () => {
    render(
      <HumanGateReviewPanel
        subtask={gate}
        dependencies={[]}
        agents={[]}
        userProfile={{ fullName: 'Dylan', avatarUrl: null }}
        deliverables={[]}
        resourceLinks={[]}
        feedback="Change image 1"
        approving={false}
        sendingFeedback={false}
        onRequestChanges={vi.fn()}
        onApprove={vi.fn()}
        onSelectDeliverable={vi.fn()}
        compact
      />,
    )

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(
      screen.getByText('If changes are needed, put them in the box below.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeEnabled()
  })
})
