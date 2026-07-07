import { DEFAULT_TASK_LIST_VIEW } from './artifact-task-schema-helper'

// Mirrors `apps/api/src/modules/spaces/spaces.service.ts` DEFAULT_SPACE_SCHEMA so the
// auto-created task space matches what `POST /api/spaces/ensure-default` produces.
export const DEFAULT_TASK_SPACE_SCHEMA = {
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
    DEFAULT_TASK_LIST_VIEW,
    {
      id: 'board',
      type: 'kanban',
      name: 'Board',
      group_by: 'status',
      visible_fields: ['title', 'priority', 'assignee', 'due_date', 'tags'],
    },
    {
      id: 'calendar',
      type: 'calendar',
      name: 'Calendar',
      calendar_config: {
        date_field: 'due_date',
        default_zoom: 'month',
        week_start: 1,
        source_mode: 'space_items',
        show_task_list: true,
        time_format: '12h',
        social_platform_filters: [],
        sources: [
          { id: 'space_items', type: 'space_items', visible: true, color: 'blue' },
          {
            id: 'campaign_social_posts',
            type: 'campaign_social_posts',
            visible: true,
            color: 'purple',
          },
          { id: 'google_calendar', type: 'google_calendar', visible: true, color: 'green' },
          { id: 'outlook', type: 'outlook', visible: true, color: 'blue' },
        ],
      },
    },
  ],
} as const
