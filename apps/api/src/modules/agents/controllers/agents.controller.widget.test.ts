import { describe, expect, it } from 'vitest'
import {
  makeAgentOperations,
  makeWidgetController,
  makeWidgetSupabase,
} from './agents-controller-test-helpers'

describe('AgentsController widget routes', () => {
  it('loads widget config from /agents/:agentKey/widget', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeWidgetController(agentOperations)
    const supabase = makeWidgetSupabase()
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' }

    await expect(
      controller.getAgentWidget(user, supabase as never, 'copywriter', scope),
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        public_agent_slug: 'vibey',
        widget: expect.objectContaining({
          widget_enabled: true,
          widget_title: 'Widget',
        }),
      }),
    )
  })

  it('updates widget config from /agents/:agentKey/widget', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeWidgetController(agentOperations)
    const supabase = makeWidgetSupabase()
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' }

    await expect(
      controller.updateAgentWidget(
        user,
        supabase as never,
        'copywriter',
        { enabled: true, title: 'Updated', campaign_id: '11111111-1111-1111-1111-111111111111' },
        scope,
      ),
    ).resolves.toEqual(expect.objectContaining({ ok: true }))
    expect(agentOperations.assertCanManageAgent).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'copywriter',
      'org-1',
    )
    expect(supabase.chains.agents_registry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        widget_enabled: true,
        widget_title: 'Updated',
        widget_campaign_id: '11111111-1111-1111-1111-111111111111',
      }),
    )
  })

  it('updates public page config from /agents/:agentKey/public-page', async () => {
    const agentOperations = makeAgentOperations()
    const controller = makeWidgetController(agentOperations)
    const supabase = makeWidgetSupabase()
    const user = { id: 'user-1' }
    const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' }

    await expect(
      controller.updateAgentPublicPage(
        user,
        supabase as never,
        'copywriter',
        { enabled: true },
        scope,
      ),
    ).resolves.toEqual({
      ok: true,
      public_page_enabled: true,
      public_agent_slug: 'sefy',
    })
    expect(agentOperations.assertCanManageAgent).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'copywriter',
      'org-1',
    )
    expect(supabase.chains.agents_registry.update).toHaveBeenCalledWith({
      public_page_enabled: true,
    })
  })
})
