export interface NavItem {
  title: string
  href: string
  icon?: string
}

export interface NavGroup {
  group: string
  pages: string[]
}

export interface DocsConfig {
  name: string
  description: string
  url: string
  logo: { light: string; dark: string }
  favicon: string
  topbarLinks: { label: string; href: string }[]
  loginUrl: string
  navigation: NavGroup[]
  footer: {
    socials: Record<string, string>
  }
}

export const docsConfig: DocsConfig = {
  name: 'Vibey',
  description: 'Vibey Documentation',
  url: 'https://docs.vibey.com',
  logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' },
  favicon: '/favicon.ico',
  topbarLinks: [],
  loginUrl: 'https://app.vibey.com',
  navigation: [
    {
      group: 'Getting Started',
      pages: [
        'getting-started/what-is-vibey',
        'getting-started/first-steps',
        'getting-started/the-home-page',
        'getting-started/create-vs-manage',
        'getting-started/vibey-vocabulary',
        'getting-started/best-practices',
      ],
    },
    {
      group: 'Your Team',
      pages: [
        'team/meet-your-agents',
        'team/named-agents',
        'team/hiring-with-jaime',
        'team/hiring-and-managing',
        'team/configuring-agents',
        'team/agent-skills',
        'team/voice-mode',
        'team/agent-collaboration',
        'team/talking-to-vibey',
        'team/campaign-panel',
      ],
    },
    {
      group: 'The Brain',
      pages: [
        'brain/how-the-brain-works',
        'brain/user-brain',
        'brain/company-brain',
        'brain/customer-brain',
        'brain/agent-brain',
        'brain/atlas-the-brain-scholar',
        'brain/cortex-max',
        'brain/what-to-put-in-each-brain',
      ],
    },
    {
      group: 'Spaces',
      pages: [
        'spaces/what-is-a-space',
        'spaces/views',
        'spaces/docs',
        'spaces/channels',
        'spaces/automations',
        'spaces/personal-space',
      ],
    },
    {
      group: 'Missions',
      pages: [
        'missions/what-are-missions',
        'missions/sending-your-first-mission',
        'missions/undo-and-redo',
      ],
    },
    {
      group: 'Campaigns',
      pages: [
        'campaigns/organizing-with-campaigns',
        'campaigns/campaign-dashboard',
        'campaigns/campaign-deliverables',
      ],
    },
    {
      group: 'Autopilot',
      pages: ['autopilot/how-autopilot-works', 'autopilot/setting-your-strategy'],
    },
    {
      group: 'Talents',
      pages: [
        'talents/what-you-can-create',
        'talents/offers',
        'talents/funnels',
        'talents/websites',
        'talents/ads',
        'talents/emails',
        'talents/social-content',
        'talents/presentations',
        'talents/avatars',
        'talents/themes',
        'talents/video-generation',
        'talents/video-editing',
        'talents/images',
        'talents/audio',
        'talents/web-browsing',
        'talents/apps',
        'talents/analytics',
      ],
    },
    {
      group: 'Integrations',
      pages: [
        'integrations/connected-platforms',
        'integrations/setting-up-integrations',
        'integrations/wordpress',
        'integrations/mcp-servers',
        'integrations/vibey-mcp',
      ],
    },
    {
      group: 'External Channels',
      pages: [
        'channels/how-channels-work',
        'channels/connecting-slack',
        'channels/connecting-telegram',
        'channels/slack-vs-telegram',
      ],
    },
    {
      group: 'Vibey Mini (Chrome)',
      pages: [
        'vibey-mini/what-it-does',
        'vibey-mini/installing',
        'vibey-mini/chat',
        'vibey-mini/saving-to-brain',
        'vibey-mini/watching-missions',
        'vibey-mini/sessions',
      ],
    },
    {
      group: 'Contacts & CRM',
      pages: ['contacts/managing-your-contacts'],
    },
    {
      group: 'Organization',
      pages: [
        'organization/how-organizations-work',
        'organization/org-only-invites',
        'organization/organization-billing',
      ],
    },
    {
      group: 'Workspace Settings',
      pages: ['settings/connecting-your-domain', 'settings/email-settings'],
    },
    {
      group: 'Account',
      pages: ['settings/account-settings', 'settings/how-billing-works'],
    },
  ],
  footer: {
    socials: {
      github: 'https://github.com/vibey',
    },
  },
}
