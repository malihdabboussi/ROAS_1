/** Shared tip categories used by chat composer active-run tips. */
export const COMPOSER_TIP_CATEGORIES = {
  priority: 'Priority',
  chatComposer: 'Chat / Composer',
  agentsTeam: 'Agents & Team',
  brain: 'Brain',
  skills: 'Skills & Workflows',
  spacesTasks: 'Spaces & Tasks',
  integrationsEmail: 'Integrations & Email',
  artifactsCampaigns: 'Artifacts & Campaigns',
  searchSharing: 'Search & Sharing',
} as const

const PRIORITY_TIPS = [
  'While the agent is replying, just keep typing — your next message queues up automatically.',
  'Type / in the message box to run any skill or workflow this agent has.',
  'Type @ to attach a funnel, offer, sequence, or any artifact to your message.',
  'Need an artifact from another campaign? Type @ then open the Campaigns tab.',
  'Press Enter on an empty message box to fire off your queued message right away.',
  "Want to change an agent's role, brain, skills, or access? Open Edit and just talk to HR.",
  'Team → Access controls which integrations and tools all your agents can use.',
  'Connect Gmail, Stripe, Slack, Meta and more in Settings → Integrations.',
  "Click the small ring on the input to see exactly what's filling the context window.",
  'Hit ⌘D to dictate instead of type, or ⌘S to start a live voice call.',
] as const

const CHAT_COMPOSER_TIPS = [
  'Shift+Enter adds a new line; Enter sends the message.',
  'Click any queued message to edit it before it goes out.',
  'Drop a file anywhere on the chat to attach it.',
  'Use the paperclip to attach files from Google Drive or Dropbox.',
  'Paste a wall of text and ROAS turns it into a clean attachable block.',
  'Pick a different model for one message from the dropdown under the input.',
  'The Send button turns into Stop while the agent is working — hit it to interrupt.',
  'Your draft sticks around per conversation until you send or clear it.',
  'Click your last sent message to edit and resend without retyping.',
] as const

const AGENTS_TEAM_TIPS = [
  'HR creates a checkpoint every time you change an agent — restore any version anytime.',
  "Toggle skills on or off per agent from the agent's info panel.",
  'Hire pre-built agents from Ready Employees — instant team members.',
  'Pin your favorite agents to the top of the team carousel.',
  "Switch campaigns and the agent's available artifacts switch with you.",
  'Fork any agent reply to branch the conversation from that point.',
  'Try a skill instantly — Settings → Skills → Try skill queues a demo prompt.',
  "Team overview shows who's working, online, idle, or offline at a glance.",
] as const

const BRAIN_TIPS = [
  'Right-click any brain to start a voice chat with Atlas.',
  'Train a brain by clicking, dragging files, or pasting (Ctrl/Cmd+V) right into it.',
  'Hit Crystallize to turn loose knowledge into structured pages.',
  'Open Cortex MAX from the brain dock for the deepest read of what it knows.',
  'Switch a brain to Customer Brain mode by right-clicking the scope.',
  'Set up recurring training from Fathom, Fireflies, Slack, or Zoom in brain settings.',
  "You'll get an in-app notification when a brain finishes ingesting your docs.",
] as const

const SKILLS_TIPS = [
  'Create your own skills in Settings → Skills.',
  "Assign skills to agents from Settings → Skills or the agent's Skills tab.",
  'Workflows show up alongside skills when you type /.',
  'Tell any agent with the skill-creator skill to write a new skill for you.',
  'Export a skill as Markdown or PDF from the skill detail panel.',
] as const

const SPACES_TASKS_TIPS = [
  'Add a research view to a Space for Instagram, TikTok, YouTube, X, or all of them.',
  "Track specific creators by adding handles in the research view's People panel.",
  'Click Analyze on any post to pull caption, transcript, or hooks.',
  'Filter what you see in research — Reels only, Shorts only, tweets only, etc.',
  "Browse pre-built Space templates from the sidebar's + button.",
  'Space Flows has 45+ automation templates ready to install.',
  'In task chat, type @@ to tag tasks, docs, or other conversations.',
  'In task chat, type / for assign-to-me, set status, or send to agent.',
  'Share a Space with view or edit permission — your call.',
  'Your Turn on home gathers everything waiting on your approval.',
  'Comment on a mission to nudge ROAS mid-flight — it reads and adjusts.',
] as const

const INTEGRATIONS_EMAIL_TIPS = [
  'Set up your sender email and domain in Settings → Email before any agent sends mail.',
  'Every agent email shows you an approval card before it actually sends.',
  'Email content lives in sequences — agents draft, you approve, your provider sends.',
  'Stripe connected? Ask any agent for revenue, products, or a payment link.',
  'Meta connected? Ask any agent for ad performance or to tweak a budget.',
  'Filter Gmail automations by inbox category — Primary, Promotions, or Updates.',
] as const

const ARTIFACTS_CAMPAIGNS_TIPS = [
  'Pin the campaign preview panel beside chat to watch artifacts update live.',
  'Funnels, sequences, offers, presentations, and avatars are all @-mentionable.',
  'Ask any agent for campaign performance as a summary, document, or full presentation.',
  'In the workflow canvas: N adds a node, ⌘⇧B fits the view, Delete removes selection.',
] as const

const SEARCH_SHARING_TIPS = [
  'Hit ⌘K from anywhere in studio to jump to search.',
  'Conversations are private until you share — pick view, edit, or admin level.',
] as const

export const COMPOSER_ACTIVE_RUN_TIPS: readonly string[] = [
  ...PRIORITY_TIPS,
  ...CHAT_COMPOSER_TIPS,
  ...AGENTS_TEAM_TIPS,
  ...BRAIN_TIPS,
  ...SKILLS_TIPS,
  ...SPACES_TASKS_TIPS,
  ...INTEGRATIONS_EMAIL_TIPS,
  ...ARTIFACTS_CAMPAIGNS_TIPS,
  ...SEARCH_SHARING_TIPS,
]
