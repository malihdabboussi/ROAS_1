import { describe, expect, it } from 'vitest'
import { CONNECTED_APP_FLOW_TRIGGERS as WEB_CONNECTED_APP_FLOW_TRIGGERS } from '../../../../../../web/src/lib/flows/connected-app-flow-triggers'
import { CreateAutomationSchema, CreatePublishedAutomationSchema } from '../../dto'
import { CONNECTED_APP_FLOW_TRIGGERS } from '../connected-app-flow-triggers'
import { SPACE_AUTOMATION_TEMPLATE_CATALOG } from '../space-automation-template-catalog'

describe('SPACE_AUTOMATION_TEMPLATE_CATALOG', () => {
  it('keeps the backend and frontend connected-app trigger catalogs in sync', () => {
    expect(WEB_CONNECTED_APP_FLOW_TRIGGERS).toEqual(CONNECTED_APP_FLOW_TRIGGERS)
  })

  it('includes 13 connected-app templates that parse as drafts', () => {
    const connected = SPACE_AUTOMATION_TEMPLATE_CATALOG.filter((row) =>
      String((row.body as { trigger?: { type?: string } }).trigger?.type ?? '').includes(
        'external_app_event',
      ),
    )
    expect(connected).toHaveLength(13)
    expect(connected.some((row) => row.integration === 'hubspot')).toBe(false)
    for (const row of connected) {
      expect(() => CreateAutomationSchema.parse(row.body)).not.toThrow()
      const parsed = CreateAutomationSchema.parse(row.body)
      if ('is_draft' in parsed) {
        expect(parsed.is_draft).toBe(true)
      }
    }
  })

  it('rejects mismatched provider and trigger slug pairs', () => {
    const result = CreatePublishedAutomationSchema.safeParse({
      name: 'Bad connected app pair',
      enabled: true,
      trigger: {
        type: 'external_app_event',
        provider: 'github',
        trigger_slug: 'GOOGLEDRIVE_FILE_CREATED_TRIGGER',
        connected_account_id: 'ca_1',
      },
      actions: [{ type: 'create_task', title_template: 'Review event' }],
    })

    expect(result.success).toBe(false)
  })

  it('requires trigger config for configurable connected-app events', () => {
    const missingConfig = CreatePublishedAutomationSchema.safeParse({
      name: 'Sheets event',
      enabled: true,
      trigger: {
        type: 'external_app_event',
        provider: 'googlesheets',
        trigger_slug: 'GOOGLESHEETS_NEW_ROWS_TRIGGER',
        connected_account_id: 'ca_1',
      },
      actions: [{ type: 'create_task', title_template: 'Review row' }],
    })
    expect(missingConfig.success).toBe(false)

    const withConfig = CreatePublishedAutomationSchema.safeParse({
      name: 'Sheets event',
      enabled: true,
      trigger: {
        type: 'external_app_event',
        provider: 'googlesheets',
        trigger_slug: 'GOOGLESHEETS_NEW_ROWS_TRIGGER',
        connected_account_id: 'ca_1',
        trigger_config: { spreadsheet_id: 'sheet_1' },
      },
      actions: [{ type: 'create_task', title_template: 'Review row' }],
    })
    expect(withConfig.success).toBe(true)
  })

  it('uses non-recorder Fathom attendee fields for CRM contacts', () => {
    const template = SPACE_AUTOMATION_TEMPLATE_CATALOG.find(
      (row) => row.template_key === 'sales-call-crm-note',
    )
    const body = template?.body as { actions?: Array<Record<string, unknown>> } | undefined
    const createContact = body?.actions?.find((action) => action.type === 'create_contact')

    expect(createContact).toMatchObject({
      email_template: '{{trigger.primary_attendee_email}}',
      name_template: '{{trigger.primary_attendee_name}}',
    })
  })

  it('targets and assigns created tasks before running Vibey', () => {
    const expectedTargets: Record<string, string> = {
      'slack-mention-agent': '{{steps.1.item_id}}',
      'weekly-social-outlier-digest': '{{steps.4.item_id}}',
      'slack-thread-reply-task': '{{steps.1.item_id}}',
      'lead-form-agent-qualification': '{{steps.2.item_id}}',
      'google-sheets-new-row-lead': '{{steps.1.item_id}}',
      'salesforce-new-lead-qualification': '{{steps.1.item_id}}',
      'github-new-issue-triage': '{{steps.1.item_id}}',
    }

    for (const [templateKey, targetRef] of Object.entries(expectedTargets)) {
      const template = SPACE_AUTOMATION_TEMPLATE_CATALOG.find(
        (row) => row.template_key === templateKey,
      )
      const body = template?.body as { actions?: Array<Record<string, unknown>> } | undefined
      const createTask = body?.actions?.find((action) => action.type === 'create_task')
      const sendToAgent = body?.actions?.find((action) => action.type === 'send_to_agent')

      expect(createTask).toMatchObject({
        assignees: [{ type: 'agent', id: 'vibey' }],
      })
      expect(sendToAgent).toMatchObject({
        agent_key: 'vibey',
        target_item_ref: targetRef,
      })
    }
  })

  it('links lead qualification tasks to the created contact', () => {
    const template = SPACE_AUTOMATION_TEMPLATE_CATALOG.find(
      (row) => row.template_key === 'lead-form-agent-qualification',
    )
    const body = template?.body as { actions?: Array<Record<string, unknown>> } | undefined
    const linkContact = body?.actions?.find((action) => action.type === 'link_item_to_contact')

    expect(linkContact).toMatchObject({
      contact_id: '{{steps.1.contact_id}}',
    })
  })

  it('includes a task-created Atlas brain context template', () => {
    const template = SPACE_AUTOMATION_TEMPLATE_CATALOG.find(
      (row) => row.template_key === 'task-created-brain-context',
    )
    expect(template?.body).toMatchObject({
      trigger: { type: 'task_created' },
      actions: [{ type: 'add_brain_context_to_task' }],
    })
    expect(() => CreateAutomationSchema.parse(template?.body)).not.toThrow()
  })

  it('includes agency funnel presets that parse as drafts', () => {
    const agency = SPACE_AUTOMATION_TEMPLATE_CATALOG.filter((row) =>
      row.workflows.includes('agency_ops'),
    )
    expect(agency.map((row) => row.template_key).sort()).toEqual([
      'agency-funnel-build',
      'agency-funnel-build-slack',
      'agency-roas-ad-kit-slack',
      'agency-strategic-research',
    ])
    for (const row of agency) {
      expect(() => CreateAutomationSchema.parse(row.body)).not.toThrow()
      const parsed = CreateAutomationSchema.parse(row.body)
      if ('is_draft' in parsed) {
        expect(parsed.is_draft).toBe(true)
      }
    }
  })
})
