import type { AccountSettingsSection } from '@/features/settings/contexts/AccountSettingsModalContext'
import type { WorkspaceSettingsSection } from '@/features/settings/contexts/WorkspaceSettingsModalContext'
import type { DailyRecommendationKey } from '../services/daily-recommendation.service'

export type DailyRecommendationAction =
  | { type: 'inline' }
  | { type: 'route'; path: string }
  | { type: 'workspace-settings'; section: WorkspaceSettingsSection }
  | { type: 'account-settings'; section: AccountSettingsSection }
  | { type: 'team-communication'; agentKey?: string; connect?: 'telegram' | 'slack' }

export interface DailyRecommendationCopy {
  title: string
  body: string
  cta: string
  action: DailyRecommendationAction
}

export const DAILY_RECOMMENDATION_COPY: Record<DailyRecommendationKey, DailyRecommendationCopy> = {
  customer_brain: {
    title: 'Turn on your Customer Brain',
    body: "I'll remember every customer detail you share with me... calls, notes, context.",
    cta: 'Enable',
    action: { type: 'inline' },
  },
  feed_brain: {
    title: 'Teach me about you',
    body: "My brain is nearly empty. Feed it a few facts and I'll get sharper everywhere.",
    cta: 'Open Brain',
    action: { type: 'route', path: '/brain' },
  },
  cortex_max: {
    title: 'Unlock Cortex Max',
    body: "You've taught me plenty... let me crystallize it into deeper, connected knowledge.",
    cta: 'Enable',
    action: { type: 'inline' },
  },
  nightly_dreaming: {
    title: 'Let me dream at night',
    body: "I'll review each day's activity overnight and surface what matters by morning.",
    cta: 'Enable',
    action: { type: 'inline' },
  },
  review_signals: {
    title: 'Signals are waiting for review',
    body: 'I spotted patterns in your workspace worth confirming. Take a look.',
    cta: 'Review',
    action: { type: 'workspace-settings', section: 'brain' },
  },
  skill_recommendations: {
    title: 'Let me suggest new skills',
    body: "I'll watch where I struggle and propose skills to fix it... you approve each one.",
    cta: 'Enable',
    action: { type: 'inline' },
  },
  first_integration: {
    title: 'Connect your first tool',
    body: 'Plug in the tools you already use and I can act in them for you.',
    cta: 'Connect',
    action: { type: 'workspace-settings', section: 'integrations' },
  },
  connect_slack: {
    title: 'Talk to me in Slack',
    body: "Connect Slack and I'm right there in your channels.",
    cta: 'Connect Slack',
    action: { type: 'team-communication', agentKey: 'vibey', connect: 'slack' },
  },
  connect_telegram: {
    title: 'Talk to me on Telegram',
    body: 'Connect Telegram and ping me from anywhere.',
    cta: 'Connect Telegram',
    action: { type: 'team-communication', agentKey: 'vibey', connect: 'telegram' },
  },
  sender_domain: {
    title: 'Send email from your own domain',
    body: "You're sending emails... verify a domain so they land in inboxes, not spam.",
    cta: 'Verify domain',
    action: { type: 'workspace-settings', section: 'email' },
  },
  custom_domain: {
    title: 'Put your funnel on your domain',
    body: 'Your funnel is live... give it a real address instead of a shared one.',
    cta: 'Add domain',
    action: { type: 'workspace-settings', section: 'domains' },
  },
  first_automation: {
    title: 'Put a task on autopilot',
    body: "Set up one automation and I'll handle that chore forever.",
    cta: 'Automate',
    action: { type: 'route', path: '/spaces' },
  },
  first_funnel: {
    title: 'Launch your first funnel',
    body: "Tell me what you're selling and I'll build the funnel with you.",
    cta: 'Build funnel',
    action: { type: 'route', path: '/campaigns' },
  },
  import_contacts: {
    title: 'Bring in your contacts',
    body: 'Import your people and I can personalize everything I do for you.',
    cta: 'Import',
    action: { type: 'route', path: '/contacts' },
  },
  invite_teammate: {
    title: 'ROAS is better together',
    body: "Invite a teammate and I'll keep everyone on the same page.",
    cta: 'Invite',
    action: { type: 'account-settings', section: 'organization' },
  },
  first_form: {
    title: 'Collect answers with a form',
    body: 'Need info from customers? Ask me to build a form in any space.',
    cta: 'Try it',
    action: { type: 'route', path: '/spaces' },
  },
  first_custom_skill: {
    title: 'Teach me a custom skill',
    body: "Show me how you do something once, and I'll do it your way every time.",
    cta: 'Create skill',
    action: { type: 'route', path: '/team/skills' },
  },
}
