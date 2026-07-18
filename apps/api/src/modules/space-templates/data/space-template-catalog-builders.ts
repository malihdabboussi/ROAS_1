import type { SpaceTemplateAutomationSeed } from './space-template-catalog.types'

export type StatusOpt = {
  id: string
  label: string
  color: string
  group: 'not_started' | 'active' | 'closed'
}

export function statusField(opts: StatusOpt[]) {
  return {
    id: 'status',
    name: 'Status',
    type: 'select',
    system: true,
    required: true,
    options: opts,
  }
}

export const PRIORITY_FIELD = {
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
}

export const ASSIGNEE_FIELD = { id: 'assignee', name: 'Assignee', type: 'assignee', system: true }
export const DUE_DATE_FIELD = { id: 'due_date', name: 'Due Date', type: 'date', system: true }
export const TITLE_FIELD = {
  id: 'title',
  name: 'Name',
  type: 'text',
  system: true,
  required: true,
}

export function taskFields(statusOptions: StatusOpt[]) {
  return [TITLE_FIELD, statusField(statusOptions), PRIORITY_FIELD, ASSIGNEE_FIELD, DUE_DATE_FIELD]
}

export function viewList(name = 'List', id = 'list') {
  return {
    id,
    type: 'list',
    name,
    visible_fields: ['title', 'status', 'priority', 'assignee', 'due_date'],
  }
}

export function viewKanban(name = 'Board', id = 'board') {
  return {
    id,
    type: 'kanban',
    name,
    group_by: 'status',
    visible_fields: ['title', 'priority', 'assignee', 'due_date'],
  }
}

export function viewDocs(name = 'Docs', id = 'docs') {
  return { id, type: 'docs', name }
}

export function viewCalendar(name = 'Calendar', id = 'calendar') {
  return { id, type: 'calendar', name, date_field: 'due_date' }
}

export function viewChannel(name = 'Channel', id = 'channel') {
  return { id, type: 'channel', name }
}

export function viewMissions(name = 'Missions', id = 'missions') {
  return { id, type: 'missions', name }
}

export function viewContacts(name = 'Contacts', id = 'contacts') {
  return { id, type: 'contacts', name }
}

export function viewTable(name = 'Table', id = 'table') {
  return {
    id,
    type: 'table',
    name,
    visible_fields: ['title', 'status', 'priority', 'assignee', 'due_date'],
  }
}

export function viewIgResearch(name = 'IG Research', id = 'ig-research') {
  return {
    id,
    type: 'instagram_research',
    name,
    icon: 'instagram',
    ig_research_config: {
      tracked_accounts: [],
      sort_by: 'outlier_score',
      sort_dir: 'desc',
      time_range: '30d',
      display_mode: 'grid',
    },
  }
}

export function viewTikTokResearch(name = 'TikTok Research', id = 'tiktok-research') {
  return {
    id,
    type: 'tiktok_research',
    name,
    icon: 'music-2',
    tiktok_research_config: {
      tracked_accounts: [],
      sort_by: 'outlier_score',
      sort_dir: 'desc',
      time_range: '30d',
      display_mode: 'grid',
    },
  }
}

export function viewYoutubeResearch(name = 'YouTube Research', id = 'youtube-research') {
  return {
    id,
    type: 'youtube_research',
    name,
    icon: 'youtube',
    youtube_research_config: {
      tracked_accounts: [],
      sort_by: 'outlier_score',
      sort_dir: 'desc',
      time_range: '30d',
      display_mode: 'grid',
    },
  }
}

export function viewTwitterResearch(name = 'X Research', id = 'twitter-research') {
  return {
    id,
    type: 'twitter_research',
    name,
    icon: 'twitter',
    twitter_research_config: {
      tracked_accounts: [],
      sort_by: 'outlier_score',
      sort_dir: 'desc',
      time_range: '30d',
      display_mode: 'grid',
    },
  }
}

export function viewSocialPosts(name = 'Social Posts', id = 'social-posts') {
  return {
    id,
    type: 'social_posts',
    name,
    icon: 'share-2',
    social_posts_config: {
      display_mode: 'grid',
      time_range: 'all',
      sort_by: 'created_at',
      sort_dir: 'desc',
    },
  }
}

export function viewFunnels(name = 'Funnels', id = 'funnels') {
  return {
    id,
    type: 'funnels',
    name,
    icon: 'git-branch',
    funnels_config: {
      display_mode: 'grid',
      time_range: 'all',
      sort_by: 'created_at',
      sort_dir: 'desc',
    },
  }
}

export function viewPresentations(name = 'Presentations', id = 'presentations') {
  return {
    id,
    type: 'presentations',
    name,
    icon: 'presentation',
    presentations_config: {
      display_mode: 'grid',
      time_range: 'all',
      sort_by: 'created_at',
      sort_dir: 'desc',
    },
  }
}

export function viewForms(name = 'Forms', id = 'forms') {
  return {
    id,
    type: 'forms',
    name,
    icon: 'file-input',
    forms_config: {
      display_mode: 'grid',
      time_range: 'all',
      sort_by: 'created_at',
      sort_dir: 'desc',
    },
  }
}

export function viewAds(name = 'Ads', id = 'ads') {
  return {
    id,
    type: 'ads',
    name,
    icon: 'megaphone',
    ads_config: {
      display_mode: 'grid',
      time_range: 'all',
      sort_by: 'created_at',
      sort_dir: 'desc',
      paid_ads_mode: 'structure',
    },
  }
}

export function viewEmails(name = 'Emails', id = 'emails') {
  return {
    id,
    type: 'emails',
    name,
    icon: 'mail',
    emails_config: {
      display_mode: 'grid',
      time_range: 'all',
      sort_by: 'created_at',
      sort_dir: 'desc',
    },
  }
}

export function viewAdsPerformance(name = 'Ads Performance', id = 'ads-performance') {
  return {
    id,
    type: 'ads_performance',
    name,
    icon: 'bar-chart-2',
    reporting_config: { time_range: '30d' },
  }
}

export function viewSocialReporting(name = 'Social Reporting', id = 'social-reporting') {
  return {
    id,
    type: 'social_reporting',
    name,
    icon: 'line-chart',
    reporting_config: { time_range: '30d' },
  }
}

export function welcomeDocBody(templateName: string, bullets: string[]): string {
  return [
    `# Welcome to your ${templateName}`,
    '',
    "This space is already wired with the views, docs, and starter tasks you need. Don't treat it like a blank board. Treat it like a working system you can make yours.",
    '',
    '## How to use this space',
    '',
    ...bullets.map((b) => `- ${b}`),
    '',
    '## Start here',
    '',
    '- Open each view once so you know what lives where.',
    '- Replace the sample tasks with real work, but keep the same flow.',
    '- Use docs for decisions, briefs, playbooks, and context your team should not have to ask for twice.',
    '- Keep tasks action-based. If it needs an owner or a due date, it belongs on the board.',
    '',
    '## Keep it alive',
    '',
    'Once a week, clean the board, update the docs, and archive anything that is no longer active. Small upkeep keeps this space useful instead of noisy.',
  ].join('\n')
}

export function docBody(lines: string[]): string {
  return lines.join('\n')
}

export const OPS_STATUSES: StatusOpt[] = [
  { id: 'backlog', label: 'Backlog', color: 'slate', group: 'not_started' },
  { id: 'in_progress', label: 'In Progress', color: 'amber', group: 'active' },
  { id: 'blocked', label: 'Blocked', color: 'red', group: 'active' },
  { id: 'done', label: 'Done', color: 'emerald', group: 'closed' },
]

export const CLIENT_STATUSES: StatusOpt[] = [
  { id: 'brief', label: 'Brief', color: 'slate', group: 'not_started' },
  { id: 'in_progress', label: 'In Progress', color: 'amber', group: 'active' },
  { id: 'review', label: 'Review', color: 'violet', group: 'active' },
  { id: 'delivered', label: 'Delivered', color: 'cyan', group: 'active' },
  { id: 'paid', label: 'Paid', color: 'emerald', group: 'closed' },
]

export const LAUNCH_STATUSES: StatusOpt[] = [
  { id: 'pre_launch', label: 'Pre-launch', color: 'slate', group: 'not_started' },
  { id: 'launch_week', label: 'Launch week', color: 'amber', group: 'active' },
  { id: 'post_launch', label: 'Post-launch', color: 'cyan', group: 'active' },
  { id: 'done', label: 'Done', color: 'emerald', group: 'closed' },
]

export const SALES_STATUSES: StatusOpt[] = [
  { id: 'new', label: 'New', color: 'slate', group: 'not_started' },
  { id: 'qualified', label: 'Qualified', color: 'blue', group: 'active' },
  { id: 'demo', label: 'Demo', color: 'violet', group: 'active' },
  { id: 'proposal', label: 'Proposal', color: 'amber', group: 'active' },
  { id: 'closed_won', label: 'Closed Won', color: 'emerald', group: 'closed' },
  { id: 'closed_lost', label: 'Closed Lost', color: 'red', group: 'closed' },
]

export const CONTENT_STATUSES: StatusOpt[] = [
  { id: 'ideas', label: 'Ideas', color: 'slate', group: 'not_started' },
  { id: 'drafting', label: 'Drafting', color: 'amber', group: 'active' },
  { id: 'scheduled', label: 'Scheduled', color: 'cyan', group: 'active' },
  { id: 'live', label: 'Live', color: 'emerald', group: 'closed' },
  { id: 'repurpose', label: 'Repurpose', color: 'violet', group: 'active' },
]

export const CAMPAIGN_STATUSES: StatusOpt[] = [
  { id: 'planning', label: 'Planning', color: 'slate', group: 'not_started' },
  { id: 'in_production', label: 'In production', color: 'amber', group: 'active' },
  { id: 'live', label: 'Live', color: 'emerald', group: 'active' },
  { id: 'optimizing', label: 'Optimizing', color: 'cyan', group: 'active' },
  { id: 'wrapped', label: 'Wrapped', color: 'violet', group: 'closed' },
]

export const ONBOARDING_STATUSES: StatusOpt[] = [
  { id: 'welcome', label: 'Welcome', color: 'slate', group: 'not_started' },
  { id: 'setup', label: 'Setup', color: 'amber', group: 'active' },
  { id: 'launch', label: 'Launch', color: 'cyan', group: 'active' },
  { id: 'adoption', label: 'Adoption', color: 'blue', group: 'active' },
  { id: 'advocate', label: 'Advocate', color: 'emerald', group: 'closed' },
]

export const HIRING_STATUSES: StatusOpt[] = [
  { id: 'applied', label: 'Applied', color: 'slate', group: 'not_started' },
  { id: 'screening', label: 'Screening', color: 'blue', group: 'active' },
  { id: 'interview', label: 'Interview', color: 'amber', group: 'active' },
  { id: 'offer', label: 'Offer', color: 'violet', group: 'active' },
  { id: 'hired', label: 'Hired', color: 'emerald', group: 'closed' },
  { id: 'rejected', label: 'Rejected', color: 'red', group: 'closed' },
]

export const ENG_STATUSES: StatusOpt[] = [
  { id: 'triage', label: 'Triage', color: 'slate', group: 'not_started' },
  { id: 'in_progress', label: 'In Progress', color: 'amber', group: 'active' },
  { id: 'review', label: 'Review', color: 'violet', group: 'active' },
  { id: 'shipped', label: 'Shipped', color: 'emerald', group: 'closed' },
  { id: 'wont_fix', label: "Won't fix", color: 'red', group: 'closed' },
]

export const WEEKLY_DIGEST_AUTOMATION: SpaceTemplateAutomationSeed = {
  name: 'Weekly Space Digest',
  trigger: {
    type: 'schedule',
    schedule: { mode: 'preset', preset: 'weekly', weekdays: [1], time: '09:00' },
    timezone: 'UTC',
  },
  actions: [
    {
      type: 'create_task',
      title_template: 'Weekly digest for {{space.title}}',
      notes_template:
        'Review this space for shipped work, blockers, overdue tasks, and next actions. Fired at {{trigger.fired_at}}.',
    },
  ],
  sort_order: 0,
}

export const FATHOM_FOLLOWUPS_AUTOMATION: SpaceTemplateAutomationSeed = {
  name: 'Fathom Call Follow-Ups',
  trigger: { type: 'external_fathom_recording_ready', source: { mode: 'self' } },
  actions: [
    {
      type: 'agent_suggest_tasks',
      agent_key: 'vibey',
      max_suggestions: 10,
      instructions:
        'Suggest concrete follow-up tasks from this Fathom meeting. Focus on tasks that need human review, approval, outreach, or execution.',
    },
  ],
  sort_order: 0,
}

export const FORM_CONTACT_AUTOMATION: SpaceTemplateAutomationSeed = {
  name: 'Form Submission To Contact',
  trigger: { type: 'form_submitted', form_id: '' },
  actions: [
    {
      type: 'create_contact',
      email_template: '{{trigger.answers.email}}',
      name_template: '{{trigger.answers.name}}',
      source: 'form',
    },
  ],
  sort_order: 0,
}
