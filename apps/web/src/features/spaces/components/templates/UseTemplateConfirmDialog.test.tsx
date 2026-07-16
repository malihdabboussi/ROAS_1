import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UseTemplateConfirmDialog } from './UseTemplateConfirmDialog'
import type { Space, SpaceSchema } from '../../types'
import type { SpaceTemplate, SpaceTemplateDetail } from '../../services/space-templates.service'

const mocks = vi.hoisted(() => ({
  getSpaceTemplate: vi.fn(),
  instantiateSpaceTemplate: vi.fn(),
  mutateSpaces: vi.fn(),
  routerPush: vi.fn(),
  setSpacesState: vi.fn(),
  setActiveSpace: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  seedComposer: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}))

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: {
    getState: () => ({
      seedComposer: mocks.seedComposer,
    }),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}))

vi.mock('@/features/spaces/hooks/use-cached-spaces', () => ({
  cachedSpaces: {
    mutate: mocks.mutateSpaces,
  },
}))

vi.mock('@/features/spaces/store/use-spaces-store', () => ({
  useSpacesStore: Object.assign(vi.fn(), {
    setState: mocks.setSpacesState,
    getState: () => ({
      setActiveSpace: mocks.setActiveSpace,
    }),
  }),
}))

vi.mock('../../services/space-templates.service', () => ({
  getSpaceTemplate: mocks.getSpaceTemplate,
  instantiateSpaceTemplate: mocks.instantiateSpaceTemplate,
}))

const schema: SpaceSchema = {
  version: 1,
  fields: [],
  views: [],
}

const template: SpaceTemplate = {
  id: 'template-1',
  slug: 'sales-pipeline',
  title: 'Sales Pipeline',
  description: 'Track prospects from first touch to close.',
  icon: 'briefcase-business',
  icon_color: 'green',
  category: 'sales',
  persona: 'sales',
  badge: null,
  featured: true,
  is_new: false,
  schema,
  channel_name: 'sales-room',
  channel_description: 'Sales team channel',
  sort_order: 1,
}

const templateDetail: SpaceTemplateDetail = {
  ...template,
  task_count: 3,
  doc_count: 2,
  automation_count: 1,
  has_channel: true,
}

const createdSpace: Space = {
  id: 'space-1',
  org_id: 'org-1',
  user_id: 'user-1',
  title: 'Launch Pipeline',
  description: null,
  campaign_id: 'campaign-1',
  is_template: false,
  visibility: 'team',
  schema,
  created_at: '2026-06-30T00:00:00.000Z',
  updated_at: '2026-06-30T00:00:00.000Z',
}

describe('UseTemplateConfirmDialog', () => {
  beforeEach(() => {
    mocks.getSpaceTemplate.mockResolvedValue(templateDetail)
    mocks.instantiateSpaceTemplate.mockResolvedValue(createdSpace)
    mocks.setSpacesState.mockImplementation((updater: unknown) => {
      if (typeof updater === 'function') {
        return (updater as (state: { spaces: Space[] }) => unknown)({ spaces: [] })
      }
      return updater
    })
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('loads template detail and creates a team space with selected options', async () => {
    const onClose = vi.fn()
    const onCreated = vi.fn()

    render(
      <UseTemplateConfirmDialog
        open
        template={template}
        campaignId="campaign-1"
        onClose={onClose}
        onCreated={onCreated}
      />,
    )

    expect(await screen.findByText('Sample tasks (3)')).toBeInTheDocument()
    expect(screen.getByText('Guide docs (2)')).toBeInTheDocument()
    expect(screen.getByText('Channel')).toBeInTheDocument()
    expect(screen.getByText('Automations as drafts (1)')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Space name'), {
      target: { value: '  Launch Pipeline  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Admin/ }))
    fireEvent.click(await screen.findByRole('option', { name: 'View only' }))
    fireEvent.click(screen.getByText('Sample tasks (3)'))
    fireEvent.click(screen.getByRole('button', { name: 'Create space' }))

    await waitFor(() => {
      expect(mocks.instantiateSpaceTemplate).toHaveBeenCalledWith('sales-pipeline', {
        title: 'Launch Pipeline',
        campaign_id: 'campaign-1',
        visibility: 'team',
        default_share_level: 'view',
        include_tasks: false,
        include_docs: true,
        include_channel: true,
        include_automations: true,
      })
    })
    expect(mocks.mutateSpaces).toHaveBeenCalledTimes(1)
    expect(mocks.setSpacesState).toHaveBeenCalledTimes(1)
    expect(mocks.setActiveSpace).toHaveBeenCalledWith('space-1')
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Created "Launch Pipeline" from template')
    expect(mocks.routerPush).toHaveBeenCalledWith('/spaces')
    expect(onCreated).toHaveBeenCalledWith(createdSpace)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('creates private spaces without a default share level', async () => {
    render(
      <UseTemplateConfirmDialog
        open
        template={template}
        campaignId={null}
        onClose={vi.fn()}
      />,
    )

    await screen.findByText('Sample tasks (3)')
    fireEvent.click(screen.getByRole('switch'))
    fireEvent.click(screen.getByRole('button', { name: 'Create space' }))

    await waitFor(() => {
      expect(mocks.instantiateSpaceTemplate).toHaveBeenCalledWith('sales-pipeline', {
        title: 'Sales Pipeline',
        campaign_id: null,
        visibility: 'private',
        default_share_level: undefined,
        include_tasks: true,
        include_docs: true,
        include_channel: true,
        include_automations: true,
      })
    })
  })

  it('shows create failures and settles without render-loop errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.instantiateSpaceTemplate.mockRejectedValue(new Error('Cannot POST /api/space-templates'))
    let commits = 0

    render(
      <Profiler id="use-template-confirm-dialog" onRender={() => (commits += 1)}>
        <UseTemplateConfirmDialog
          open
          template={template}
          campaignId="campaign-1"
          onClose={vi.fn()}
        />
      </Profiler>,
    )

    await screen.findByText('Sample tasks (3)')
    fireEvent.click(screen.getByRole('button', { name: 'Create space' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not create space from template',
    )
    expect(mocks.toastError).toHaveBeenCalledWith('Could not create space from template')
    expect(screen.getByRole('button', { name: 'Create space' })).not.toBeDisabled()
    expect(commits).toBeLessThan(25)
    expect(consoleErrorSpy.mock.calls.flat().join('\n')).not.toMatch(
      /maximum update depth|too many re-renders/i,
    )

    consoleErrorSpy.mockRestore()
  })
})
