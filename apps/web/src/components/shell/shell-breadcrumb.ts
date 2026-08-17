import {
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  ContactRound,
  FolderGit2,
  FolderKanban,
  Inbox,
  Layers3,
  ListChecks,
  ListTodo,
  MessageSquare,
  SendHorizontal,
  Users,
  Workflow,
} from 'lucide-react'

export type ShellRouteBreadcrumb = {
  label: string
  Icon: typeof Inbox
}

export function breadcrumbFromPath(
  pathname: string,
  spaceTitle: string | null,
): ShellRouteBreadcrumb {
  if (pathname === '/home') return { label: '', Icon: MessageSquare }
  if (pathname.startsWith('/home/inbox')) return { label: 'Inbox', Icon: Inbox }
  if (pathname.startsWith('/home/meetings')) return { label: 'Meetings', Icon: CalendarDays }
  if (pathname.startsWith('/home/my-tasks')) return { label: 'My Tasks', Icon: ListChecks }
  if (pathname.startsWith('/home/delegation-desk')) {
    return { label: 'Delegation Desk', Icon: SendHorizontal }
  }
  if (pathname.startsWith('/home/channels')) return { label: 'Channels', Icon: MessageSquare }
  if (pathname.startsWith('/team/skills')) return { label: 'Skills', Icon: Layers3 }
  if (pathname.startsWith('/team/teams')) return { label: 'Teams', Icon: Users }
  if (pathname.startsWith('/team/people')) return { label: 'People', Icon: ContactRound }
  if (pathname.startsWith('/team')) return { label: 'Team', Icon: Users }
  if (pathname.startsWith('/client-campaigns')) {
    return { label: 'Client Campaigns', Icon: BriefcaseBusiness }
  }
  if (pathname.startsWith('/clients/')) return { label: 'Clients', Icon: ContactRound }
  if (pathname.startsWith('/clients')) return { label: 'Clients', Icon: ContactRound }
  if (pathname.startsWith('/brain')) return { label: 'Brain', Icon: Brain }
  if (pathname.startsWith('/chats')) return { label: 'Chats', Icon: MessageSquare }
  if (pathname.startsWith('/artifacts')) return { label: 'All Artifacts', Icon: Layers3 }
  if (pathname.startsWith('/projects')) return { label: 'Projects', Icon: FolderGit2 }
  if (pathname.startsWith('/flows')) return { label: 'Flows', Icon: Workflow }
  if (pathname.startsWith('/programs')) return { label: 'Programs', Icon: FolderKanban }
  if (pathname.startsWith('/all-tasks')) return { label: 'All Tasks', Icon: ListTodo }
  if (pathname.startsWith('/campaigns')) return { label: 'Campaigns', Icon: ListChecks }
  if (pathname.startsWith('/spaces')) {
    return {
      label: spaceTitle ? `Campaigns / ${spaceTitle}` : 'Campaigns',
      Icon: ListChecks,
    }
  }
  return { label: '', Icon: MessageSquare }
}
