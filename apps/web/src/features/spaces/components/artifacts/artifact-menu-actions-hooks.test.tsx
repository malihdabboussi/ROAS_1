import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  deleteAd,
  deleteAvatar,
  deleteEmailArtifact,
  deletePresentation,
  deleteSequence,
  updateAd,
  updateAvatar,
  updateEmailArtifact,
  updatePresentation,
  updateSequence,
} from '@/lib/artifacts/artifact-menu-actions-api'
import { deleteFunnel, updateFunnel } from '@/lib/artifacts/funnel-preview-api'
import { fetchCampaigns } from '@/lib/campaigns'
import { updateForm } from '@/lib/forms'
import { useAdMenuActions } from './ad/use-ad-menu-actions'
import { useAvatarMenuActions } from './avatar/use-avatar-menu-actions'
import { useEmailMenuActions } from './email/use-email-menu-actions'
import { useFormMenuActions } from './form/use-form-menu-actions'
import { useFunnelMenuActions } from './funnel/use-funnel-menu-actions'
import { usePresentationMenuActions } from './presentation/use-presentation-menu-actions'
import { useSequenceMenuActions } from './sequence/use-sequence-menu-actions'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/features/spaces/components/ViewSwitcher', () => ({
  buildNewViewDef: vi.fn(() => ({ id: 'email_analytics_new', type: 'email_analytics' })),
}))

vi.mock('@/features/spaces/services/spaces.service', () => ({
  updateSpace: vi.fn(),
}))

vi.mock('@/features/spaces/store/use-spaces-store', () => ({
  useSpacesStore: {
    getState: vi.fn(() => ({
      activeSpaceId: 'space-1',
      patchActiveSpaceSchema: vi.fn(),
      setActiveView: vi.fn(),
      spaces: [],
    })),
  },
}))

vi.mock('@/lib/artifacts/artifact-menu-actions-api', () => ({
  deleteAvatar: vi.fn(),
  deleteAd: vi.fn(),
  deletePresentation: vi.fn(),
  deleteSequence: vi.fn(),
  deleteEmailArtifact: vi.fn(),
  updateAd: vi.fn(),
  updateAvatar: vi.fn(),
  updateEmailArtifact: vi.fn(),
  updatePresentation: vi.fn(),
  updateSequence: vi.fn(),
}))

vi.mock('@/lib/artifacts/funnel-preview-api', () => ({
  deleteFunnel: vi.fn(),
  updateFunnel: vi.fn(),
}))

vi.mock('@/lib/campaigns', () => ({
  copyArtifactToCampaign: vi.fn(),
  fetchCampaigns: vi.fn(),
  moveArtifactToCampaign: vi.fn(),
}))

vi.mock('@/lib/forms', () => ({
  deleteForm: vi.fn(),
  fetchFormResponses: vi.fn(),
  publishForm: vi.fn(),
  unpublishForm: vi.fn(),
  updateForm: vi.fn(),
}))

const fetchCampaignsMock = vi.mocked(fetchCampaigns)
const updateAdMock = vi.mocked(updateAd)
const updateAvatarMock = vi.mocked(updateAvatar)
const updateEmailArtifactMock = vi.mocked(updateEmailArtifact)
const updateFormMock = vi.mocked(updateForm)
const updateFunnelMock = vi.mocked(updateFunnel)
const updatePresentationMock = vi.mocked(updatePresentation)
const updateSequenceMock = vi.mocked(updateSequence)

function MenuActionsHarness({
  onChanged,
  onRender,
}: {
  onChanged: () => void
  onRender: () => void
}) {
  onRender()
  const avatar = useAvatarMenuActions({
    avatar: { id: 'avatar-1', name: 'Buyer Avatar', campaign_id: 'campaign-1' },
    onChanged,
  })
  const ad = useAdMenuActions({
    ad: {
      id: 'ad-1',
      headline: 'Launch Ad',
      primary_text: 'Primary text',
      campaign_id: 'campaign-1',
      ad_set_id: null,
    },
    onChanged,
  })
  const presentation = usePresentationMenuActions({
    presentation: { id: 'presentation-1', name: 'Launch Deck', campaign_id: 'campaign-1' },
    onChanged,
  })
  const funnel = useFunnelMenuActions({
    funnel: {
      id: 'funnel-1',
      name: 'Launch Funnel',
      status: 'draft',
      slug: 'launch-funnel',
      published_url: null,
      campaign_id: 'campaign-1',
    },
    onChanged,
  })
  const sequence = useSequenceMenuActions({
    sequence: { id: 'sequence-1', name: 'Follow Up', campaign_id: 'campaign-1' },
    onChanged,
  })
  const form = useFormMenuActions({
    form: {
      id: 'form-1',
      name: 'Lead Form',
      status: 'draft',
      share_token: 'share-token',
      visibility: 'public',
      published_url: null,
      campaign_id: 'campaign-1',
      space_id: 'space-1',
      target_space_id: null,
    },
    onChanged,
  })
  const email = useEmailMenuActions({
    email: { id: 'email-1', subject: 'Launch Email', campaign_id: 'campaign-1' },
    onChanged,
  })

  return (
    <div>
      <p data-testid="campaign-counts">
        {ad.campaigns.length}:{avatar.campaigns.length}:{presentation.campaigns.length}:
        {funnel.campaigns.length}:{sequence.campaigns.length}:{form.campaigns.length}:
        {email.campaigns.length}
      </p>
      <p>{ad.displayName}</p>
      <p>{avatar.displayName}</p>
      <p>{presentation.displayName}</p>
      <p>{funnel.isPublished ? 'published funnel' : 'draft funnel'}</p>
      <p>{sequence.displayName}</p>
      <p>{form.isPublished ? 'published form' : 'draft form'}</p>
      <p>{email.displayName}</p>
      <button type="button" onClick={() => void ad.rename()}>
        rename ad
      </button>
      <button type="button" onClick={() => void avatar.rename()}>
        rename avatar
      </button>
      <button type="button" onClick={() => void presentation.rename()}>
        rename presentation
      </button>
      <button type="button" onClick={() => void funnel.rename()}>
        rename funnel
      </button>
      <button type="button" onClick={() => void sequence.rename()}>
        rename sequence
      </button>
      <button type="button" onClick={() => void form.rename()}>
        rename form
      </button>
      <button type="button" onClick={() => void email.rename()}>
        rename email
      </button>
    </div>
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('artifact menu action hooks', () => {
  beforeEach(() => {
    fetchCampaignsMock.mockReset()
    updateAdMock.mockReset()
    updateAvatarMock.mockReset()
    updateEmailArtifactMock.mockReset()
    updateFormMock.mockReset()
    updateFunnelMock.mockReset()
    updatePresentationMock.mockReset()
    updateSequenceMock.mockReset()
    vi.mocked(deleteAd).mockReset()
    vi.mocked(deleteAvatar).mockReset()
    vi.mocked(deleteEmailArtifact).mockReset()
    vi.mocked(deleteFunnel).mockReset()
    vi.mocked(deletePresentation).mockReset()
    vi.mocked(deleteSequence).mockReset()

    fetchCampaignsMock.mockResolvedValue([
      {
        id: 'campaign-1',
        user_id: 'user-1',
        name: 'Launch',
        campaign_type: 'standard',
        status: 'active',
        config: {},
        metrics: {},
        created_at: '2026-06-27T00:00:00.000Z',
        updated_at: '2026-06-27T00:00:00.000Z',
      },
    ])
    updateAdMock.mockResolvedValue({
      id: 'ad-1',
      headline: 'Ad v2',
    } as Awaited<ReturnType<typeof updateAd>>)
    updateAvatarMock.mockResolvedValue({
      id: 'avatar-1',
      name: 'Buyer v2',
    } as Awaited<ReturnType<typeof updateAvatar>>)
    updateEmailArtifactMock.mockResolvedValue({
      id: 'email-1',
      subject: 'Email v2',
    } as Awaited<ReturnType<typeof updateEmailArtifact>>)
    updateFunnelMock.mockResolvedValue({
      id: 'funnel-1',
      name: 'Funnel v2',
    } as Awaited<ReturnType<typeof updateFunnel>>)
    updateFormMock.mockResolvedValue({
      id: 'form-1',
      name: 'Form v2',
    } as Awaited<ReturnType<typeof updateForm>>)
    updatePresentationMock.mockResolvedValue({
      id: 'presentation-1',
      name: 'Deck v2',
    } as Awaited<ReturnType<typeof updatePresentation>>)
    updateSequenceMock.mockResolvedValue({
      id: 'sequence-1',
      name: 'Follow Up v2',
    } as Awaited<ReturnType<typeof updateSequence>>)
  })

  it('loads campaign menus, delegates renames, and settles without render churn', async () => {
    let renderCount = 0
    const onChanged = vi.fn()
    const promptMock = vi
      .spyOn(window, 'prompt')
      .mockReturnValueOnce('Ad v2')
      .mockReturnValueOnce('Buyer v2')
      .mockReturnValueOnce('Deck v2')
      .mockReturnValueOnce('Funnel v2')
      .mockReturnValueOnce('Follow Up v2')
      .mockReturnValueOnce('Form v2')
      .mockReturnValueOnce('Email v2')

    render(
      <MenuActionsHarness
        onChanged={onChanged}
        onRender={() => {
          renderCount += 1
        }}
      />,
    )

    await waitFor(() =>
      expect(screen.getByTestId('campaign-counts').textContent?.replace(/\s+/g, '')).toBe(
        '1:1:1:1:1:1:1',
      ),
    )

    expect(screen.getByText('Launch Ad')).toBeTruthy()
    expect(screen.getByText('Buyer Avatar')).toBeTruthy()
    expect(screen.getByText('Launch Deck')).toBeTruthy()
    expect(screen.getByText('draft funnel')).toBeTruthy()
    expect(screen.getByText('Follow Up')).toBeTruthy()
    expect(screen.getByText('draft form')).toBeTruthy()
    expect(screen.getByText('Launch Email')).toBeTruthy()
    expect(fetchCampaignsMock).toHaveBeenCalledTimes(7)
    expect(renderCount).toBeLessThan(25)

    fireEvent.click(screen.getByText('rename ad'))
    fireEvent.click(screen.getByText('rename avatar'))
    fireEvent.click(screen.getByText('rename presentation'))
    fireEvent.click(screen.getByText('rename funnel'))
    fireEvent.click(screen.getByText('rename sequence'))
    fireEvent.click(screen.getByText('rename form'))
    fireEvent.click(screen.getByText('rename email'))

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(7))
    expect(updateAdMock).toHaveBeenCalledWith('ad-1', { headline: 'Ad v2' })
    expect(updateAvatarMock).toHaveBeenCalledWith('avatar-1', { name: 'Buyer v2' })
    expect(updatePresentationMock).toHaveBeenCalledWith('presentation-1', { name: 'Deck v2' })
    expect(updateFunnelMock).toHaveBeenCalledWith('funnel-1', { name: 'Funnel v2' })
    expect(updateSequenceMock).toHaveBeenCalledWith('sequence-1', 'Follow Up v2')
    expect(updateFormMock).toHaveBeenCalledWith('form-1', { name: 'Form v2' })
    expect(updateEmailArtifactMock).toHaveBeenCalledWith('email-1', { subject: 'Email v2' })
    expect(promptMock).toHaveBeenCalledTimes(7)
  })
})
