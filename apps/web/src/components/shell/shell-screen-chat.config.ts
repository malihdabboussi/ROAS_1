/**
 * Navigation-aware chat pane: which left-sidebar screens carry their own
 * "last chat" identity, and what the pane does with it on navigation.
 *
 * Space, campaign, and channel routes are excluded on purpose — their chat
 * panel host already scopes conversations (`space:`/`channel:` panel keys),
 * so the shell must not compete with that mechanism. `/home` is excluded
 * because its full-page chat has its own new-chat flow.
 */

export interface ShellChatScreen {
  key: string
  label: string
}

const SCREEN_ROUTES: ReadonlyArray<{ prefix: string } & ShellChatScreen> = [
  { prefix: '/home/inbox', key: 'home:inbox', label: 'Inbox' },
  { prefix: '/home/meetings', key: 'home:meetings', label: 'Meetings' },
  { prefix: '/home/my-tasks', key: 'all-tasks', label: 'All Tasks' },
  { prefix: '/home/delegation-desk', key: 'home:delegation-desk', label: 'Delegation Desk' },
  { prefix: '/client-campaigns', key: 'client-campaigns', label: 'Client Campaigns' },
  { prefix: '/launches', key: 'launches', label: 'Launches' },
  { prefix: '/clients', key: 'clients', label: 'Clients' },
  { prefix: '/team', key: 'team', label: 'Team' },
  { prefix: '/brain', key: 'brain', label: 'Brain' },
  { prefix: '/chats', key: 'chats', label: 'Chats' },
  { prefix: '/artifacts', key: 'artifacts', label: 'Artifacts' },
  { prefix: '/projects', key: 'projects', label: 'Projects' },
  { prefix: '/flows', key: 'flows', label: 'Flows' },
  { prefix: '/programs', key: 'programs', label: 'Programs' },
  { prefix: '/contacts', key: 'contacts', label: 'Contacts' },
  { prefix: '/lists', key: 'lists', label: 'Lists' },
  { prefix: '/all-tasks', key: 'all-tasks', label: 'All Tasks' },
]

export function shellChatScreenForPathname(pathname: string): ShellChatScreen | null {
  if (pathname.startsWith('/home/channels')) return null
  if (pathname.startsWith('/spaces') || pathname.startsWith('/campaigns')) return null
  const match = SCREEN_ROUTES.find((route) => pathname.startsWith(route.prefix))
  return match ? { key: match.key, label: match.label } : null
}
