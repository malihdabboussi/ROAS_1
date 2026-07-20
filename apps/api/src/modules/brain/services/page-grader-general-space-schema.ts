export const PAGE_GRADER_GENERAL_SPACE_TITLE = 'General'

export function buildPageGraderGeneralSpaceSchema(input: {
  pageGraderClientId: string
  uniqueClientId: string
}) {
  return {
    version: 1,
    icon: 'layout-grid',
    fields: [
      { id: 'title', name: 'Name', type: 'text', system: true, required: true },
      {
        id: 'status',
        name: 'Status',
        type: 'select',
        system: true,
        required: true,
        options: [
          { id: 'todo', label: 'To Do', color: 'cyan', group: 'not_started' },
          { id: 'in_progress', label: 'In Progress', color: 'amber', group: 'active' },
          { id: 'in_review', label: 'In Review', color: 'violet', group: 'active' },
          { id: 'done', label: 'Completed', color: 'emerald', group: 'closed' },
          { id: 'archived', label: 'Closed', color: 'slate', group: 'closed' },
        ],
      },
      {
        id: 'priority',
        name: 'Priority',
        type: 'select',
        system: true,
        required: true,
        options: [
          { id: 'low', label: 'Low', color: 'slate' },
          { id: 'medium', label: 'Medium', color: 'blue' },
          { id: 'high', label: 'High', color: 'orange' },
          { id: 'urgent', label: 'Urgent', color: 'red' },
        ],
      },
      { id: 'assignee', name: 'Assignee', type: 'assignee', system: true },
      { id: 'due_date', name: 'Due Date', type: 'date', system: true },
      { id: 'tags', name: 'Tags', type: 'multi_select', system: true, options: [] },
    ],
    views: [
      { id: 'campaign-overview', type: 'campaign_overview', name: 'Overview' },
      { id: 'docs', type: 'docs', name: 'Docs' },
      { id: 'missions', type: 'missions', name: 'Missions' },
      { id: 'calendar', type: 'calendar', name: 'Calendar' },
    ],
    custom_data: {
      source: 'page_grader',
      space_role: 'general',
      page_grader_client_id: input.pageGraderClientId || null,
      unique_client_id: input.uniqueClientId || null,
    },
  }
}
