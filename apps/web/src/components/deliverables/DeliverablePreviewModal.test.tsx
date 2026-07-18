import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DeliverableEntityPreviewRenderer } from '@/components/deliverables/deliverable-preview-modal.types'
import type { MissionDeliverable } from '@/lib/missions'
import { DeliverablePreviewModal } from './DeliverablePreviewModal'

const modalMocks = vi.hoisted(() => ({
  bodyRenderCount: 0,
  entityAdapterRenderCount: 0,
  previewActionsRenderCount: 0,
  handleBrainDropdownToggle: vi.fn(),
  handleBrainIngest: vi.fn(),
  handleCampaignDropdownToggle: vi.fn(),
  handleCopy: vi.fn(),
  handleEntityExport: vi.fn(),
  handleExportMd: vi.fn(),
  handleExportPdf: vi.fn(),
  handleSelectCampaign: vi.fn(),
  onClose: vi.fn(),
  onDeliverableRenamed: vi.fn(),
  renameItemCommentAttachment: vi.fn(),
  setBrainDropdownOpen: vi.fn(),
  setCampaignAction: vi.fn(),
  setCampaignDropdownOpen: vi.fn(),
  setCopied: vi.fn(),
  setConfirmBrain: vi.fn(),
  toastError: vi.fn(),
  updateMissionDeliverable: vi.fn(),
}))

vi.mock('@/components/deliverables/DeliverablePreviewBody', () => ({
  DeliverablePreviewBody: ({
    renderEntityPreview,
  }: {
    renderEntityPreview: DeliverableEntityPreviewRenderer
  }) => {
    modalMocks.bodyRenderCount += 1
    return (
      <div data-testid="deliverable-preview-body">
        {renderEntityPreview({ deliverableType: 'ad', entityId: 'ad-1' })}
      </div>
    )
  },
}))

vi.mock('@/components/deliverables/DeliverablePreviewBrainConfirmDialog', () => ({
  DeliverablePreviewBrainConfirmDialog: () => <div data-testid="brain-confirm-dialog" />,
}))

vi.mock('@/components/deliverables/DeliverablePreviewActions', () => ({
  DeliverablePreviewActions: () => {
    modalMocks.previewActionsRenderCount += 1
    return <div data-testid="preview-actions" />
  },
}))

vi.mock('@/components/deliverables/DeliverablePreviewModalToolbar', () => ({
  DeliverablePreviewModalToolbar: () => <div data-testid="modal-toolbar" />,
}))

vi.mock('@/components/deliverables/use-deliverable-brain-menu', () => ({
  useDeliverableBrainMenu: () => ({
    brainButtonRef: { current: null },
    brainDropdownOpen: false,
    brainDropdownPos: null,
    brainIngesting: false,
    brainOptions: [],
    brainsLoading: false,
    confirmBrain: null,
    handleBrainDropdownToggle: modalMocks.handleBrainDropdownToggle,
    handleBrainIngest: modalMocks.handleBrainIngest,
    setBrainDropdownOpen: modalMocks.setBrainDropdownOpen,
    setConfirmBrain: modalMocks.setConfirmBrain,
  }),
}))

vi.mock('@/components/deliverables/use-deliverable-campaign-menu', () => ({
  useDeliverableCampaignMenu: () => ({
    campaignAction: 'move',
    campaignButtonRef: { current: null },
    campaignDropdownOpen: false,
    campaignDropdownPos: null,
    campaignOptions: [],
    campaignsLoading: false,
    eligible: false,
    handleCampaignDropdownToggle: modalMocks.handleCampaignDropdownToggle,
    handleSelectCampaign: modalMocks.handleSelectCampaign,
    movingToCampaign: false,
    setCampaignAction: modalMocks.setCampaignAction,
    setCampaignDropdownOpen: modalMocks.setCampaignDropdownOpen,
  }),
}))

vi.mock('@/components/deliverables/use-deliverable-entity-content', () => ({
  useDeliverableEntityContent: () => ({
    effectiveContent: 'Body copy',
    entityContentLoading: false,
    entityData: null,
    entityTextContent: null,
    hasSourcePdfFile: false,
    isEntityType: false,
    isTextContent: true,
    isTextType: true,
  }),
}))

vi.mock('@/components/deliverables/use-deliverable-export-actions', () => ({
  useDeliverableExportActions: () => ({
    contentRef: { current: null },
    copied: false,
    exporting: false,
    handleCopy: modalMocks.handleCopy,
    handleEntityExport: modalMocks.handleEntityExport,
    handleExportMd: modalMocks.handleExportMd,
    handleExportPdf: modalMocks.handleExportPdf,
    setCopied: modalMocks.setCopied,
  }),
}))

vi.mock('@/lib/services/docs-api', () => ({
  updateMissionDeliverable: modalMocks.updateMissionDeliverable,
}))

vi.mock('@/lib/spaces', () => ({
  renameItemCommentAttachment: modalMocks.renameItemCommentAttachment,
}))

vi.mock('sonner', () => ({
  toast: {
    error: modalMocks.toastError,
  },
}))

vi.mock('./DeliverablePreviewMetaRow', () => ({
  default: () => <div data-testid="meta-row" />,
}))

const activityAttachmentDeliverable: MissionDeliverable = {
  id: 'deliverable-from-activity',
  mission_id: 'mission-1',
  campaign_id: 'campaign-1',
  user_id: 'user-1',
  agent_key: 'vibey',
  type: 'file',
  title: 'Original.pdf',
  content: 'Body copy',
  file_url: 'https://files.example/original.pdf',
  file_name: 'Original.pdf',
  file_size: 1234,
  mime_type: 'application/pdf',
  metadata: {
    activityId: 'activity-1',
    itemId: 'item-1',
    source: 'task_activity_comment',
    spaceId: 'space-1',
  },
  entity_id: null,
  entity_table: null,
  source: 'mission',
  created_at: '2026-06-28T11:10:00.000Z',
}

const uuidDeliverable: MissionDeliverable = {
  ...activityAttachmentDeliverable,
  id: 'fb8db017-0d90-4ee7-8fb8-8d4ae36f3c67',
  title: 'Mission brief',
  file_url: null,
  file_name: null,
  metadata: {},
}

const renderEntityPreview: DeliverableEntityPreviewRenderer = ({ deliverableType, entityId }) => {
  modalMocks.entityAdapterRenderCount += 1
  return (
    <div
      data-testid="entity-preview-adapter"
      data-deliverable-type={deliverableType}
      data-entity-id={entityId}
    />
  )
}

function renderModal(
  deliverable: MissionDeliverable = activityAttachmentDeliverable,
  presentation: 'docked' | 'centered' = 'docked',
) {
  let renderCount = 0

  function Harness() {
    renderCount += 1
    return (
      <DeliverablePreviewModal
        deliverable={deliverable}
        agents={[]}
        onClose={modalMocks.onClose}
        onDeliverableRenamed={modalMocks.onDeliverableRenamed}
        presentation={presentation}
        renderEntityPreview={renderEntityPreview}
      />
    )
  }

  const result = render(<Harness />)
  return { ...result, getRenderCount: () => renderCount }
}

describe('DeliverablePreviewModal', () => {
  beforeEach(() => {
    modalMocks.bodyRenderCount = 0
    modalMocks.entityAdapterRenderCount = 0
    modalMocks.previewActionsRenderCount = 0
    for (const value of Object.values(modalMocks)) {
      if (typeof value === 'function' && 'mockReset' in value) {
        value.mockReset()
      }
    }
    modalMocks.renameItemCommentAttachment.mockResolvedValue({
      id: 'activity-1',
      item_id: 'item-1',
      space_id: 'space-1',
      user_id: 'user-1',
      org_id: 'org-1',
      event_type: 'comment',
      payload: {},
      created_at: '2026-06-28T11:10:00.000Z',
    })
    modalMocks.updateMissionDeliverable.mockResolvedValue({
      id: 'fb8db017-0d90-4ee7-8fb8-8d4ae36f3c67',
      title: 'Renamed mission brief',
    })
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        addEventListener: vi.fn(),
        matches: false,
        removeEventListener: vi.fn(),
      })),
      writable: true,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renames task activity attachments through the Spaces activity API without render churn', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { getRenderCount } = renderModal()

    fireEvent.click(screen.getByRole('button', { name: 'Original.pdf' }))
    fireEvent.change(screen.getByLabelText('Rename file'), {
      target: { value: 'Renamed.pdf' },
    })
    fireEvent.blur(screen.getByLabelText('Rename file'))

    await waitFor(() =>
      expect(modalMocks.renameItemCommentAttachment).toHaveBeenCalledWith(
        'space-1',
        'item-1',
        'activity-1',
        'https://files.example/original.pdf',
        'Renamed.pdf',
      ),
    )
    expect(modalMocks.updateMissionDeliverable).not.toHaveBeenCalled()
    expect(modalMocks.onDeliverableRenamed).toHaveBeenCalledWith('Renamed.pdf')
    expect(screen.getByRole('button', { name: 'Renamed.pdf' })).toBeTruthy()
    const preview = screen.getByTestId('entity-preview-adapter')
    expect(preview.dataset.deliverableType).toBe('ad')
    expect(preview.dataset.entityId).toBe('ad-1')

    const renderLoopErrors = consoleErrorSpy.mock.calls.filter(([message]) =>
      String(message).match(/maximum update depth|too many re-renders/i),
    )
    expect(renderLoopErrors).toHaveLength(0)
    expect(getRenderCount()).toBeLessThan(5)
    expect(modalMocks.bodyRenderCount).toBeLessThan(20)
    expect(modalMocks.entityAdapterRenderCount).toBeLessThan(20)
    expect(modalMocks.previewActionsRenderCount).toBeLessThan(20)

    consoleErrorSpy.mockRestore()
  })

  it('centers previews launched from a Mission without the docked top shelf', () => {
    const { container } = renderModal(activityAttachmentDeliverable, 'centered')

    const workspace = container.querySelector('[data-deliverable-preview-presentation]')
    expect(workspace?.getAttribute('data-deliverable-preview-presentation')).toBe('centered')
    expect(workspace?.className).toContain('items-center')
    expect(workspace?.className).not.toContain('top-spacing-10')
    expect(screen.queryByRole('separator')).toBeNull()
  })

  it('opens general previews as a resizable 45-percent right dock', () => {
    const { container } = renderModal()

    const panel = container.querySelector('[data-deliverable-preview-panel]') as HTMLElement
    expect(panel.style.width).toBe(`${Math.round(window.innerWidth * 0.45)}px`)
    expect(screen.getByRole('separator')).toBeTruthy()
  })

  it('renames persisted mission deliverables through the mission deliverable API without render churn', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { getRenderCount } = renderModal(uuidDeliverable)

    fireEvent.click(screen.getByRole('button', { name: 'Mission brief' }))
    fireEvent.change(screen.getByLabelText('Rename file'), {
      target: { value: 'Renamed mission brief' },
    })
    fireEvent.keyDown(screen.getByLabelText('Rename file'), { key: 'Enter' })

    await waitFor(() =>
      expect(modalMocks.updateMissionDeliverable).toHaveBeenCalledWith(
        'fb8db017-0d90-4ee7-8fb8-8d4ae36f3c67',
        { title: 'Renamed mission brief' },
      ),
    )
    expect(modalMocks.renameItemCommentAttachment).not.toHaveBeenCalled()
    expect(modalMocks.onDeliverableRenamed).toHaveBeenCalledWith('Renamed mission brief')
    expect(screen.getByRole('button', { name: 'Renamed mission brief' })).toBeTruthy()

    const renderLoopErrors = consoleErrorSpy.mock.calls.filter(([message]) =>
      String(message).match(/maximum update depth|too many re-renders/i),
    )
    expect(renderLoopErrors).toHaveLength(0)
    expect(getRenderCount()).toBeLessThan(5)
    expect(modalMocks.bodyRenderCount).toBeLessThan(20)
    expect(modalMocks.entityAdapterRenderCount).toBeLessThan(20)
    expect(modalMocks.previewActionsRenderCount).toBeLessThan(20)

    consoleErrorSpy.mockRestore()
  })
})
