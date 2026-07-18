import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellWorkspace } from './ShellWorkspace'

const mocks = vi.hoisted(() => ({
  pathname: '/home',
  params: new Map<string, string>(),
  activeConversationId: null as string | null,
  replace: vi.fn(),
  push: vi.fn(),
  setCollapsed: vi.fn(),
  setActiveConversationId: vi.fn(),
  openConversationInSpaceChat: vi.fn(),
  setSpaceWorkOpen: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  useSearchParams: () => ({ get: (key: string) => mocks.params.get(key) ?? null }),
}))

vi.mock('@/components/global-chat/containers/GlobalChatPanel', () => ({
  GlobalChatPanel: () => <div>Global chat panel</div>,
}))

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: (selector: (state: { setCollapsed: typeof mocks.setCollapsed }) => unknown) =>
    selector({ setCollapsed: mocks.setCollapsed }),
}))

vi.mock('@/features/spaces/store/use-spaces-store', () => ({
  useSpacesStore: (
    selector: (state: {
      openConversationInSpaceChat: typeof mocks.openConversationInSpaceChat
    }) => unknown,
  ) => selector({ openConversationInSpaceChat: mocks.openConversationInSpaceChat }),
}))

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: (
    selector: (state: {
      activeConversationId: string | null
      setActiveConversationId: typeof mocks.setActiveConversationId
    }) => unknown,
  ) =>
    selector({
      activeConversationId: mocks.activeConversationId,
      setActiveConversationId: mocks.setActiveConversationId,
    }),
}))

vi.mock('@/features/studio/components/preview/ShellArtifactViewerAdapter', () => ({
  ShellArtifactViewerAdapter: () => null,
}))

vi.mock('./ShellChatDrawer', () => ({ ShellChatDrawer: () => null }))
vi.mock('./ShellNewChatGreeting', () => ({
  ShellNewChatGreeting: () => <div>New chat greeting</div>,
}))
vi.mock('./ShellRightPanel', () => ({ ShellRightPanel: () => null }))
vi.mock('./SpaceWorkDock', () => ({
  SpaceWorkDock: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('./use-shell-store', () => ({
  useShellStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      spaceWorkOpen: true,
      chatDrawer: { open: false },
      openChatDrawer: vi.fn(),
      minimizeChatDrawer: vi.fn(),
      requestNewChat: vi.fn(),
      setMenuMode: vi.fn(),
      setSpaceWorkOpen: mocks.setSpaceWorkOpen,
    }),
}))

describe('ShellWorkspace', () => {
  beforeEach(() => {
    mocks.pathname = '/home'
    mocks.params = new Map([['chat', 'starting']])
    mocks.activeConversationId = null
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('mounts the chat panel while a Home conversation is starting', () => {
    render(<ShellWorkspace>Home dashboard</ShellWorkspace>)

    expect(screen.getByText('Global chat panel')).toBeInTheDocument()
    expect(screen.queryByText('New chat greeting')).not.toBeInTheDocument()
  })

  it('replaces the temporary starting route with the created conversation route', async () => {
    mocks.activeConversationId = 'conversation-123'

    render(<ShellWorkspace>Home dashboard</ShellWorkspace>)

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/home?conv=conversation-123')
    })
  })

  it('opens the Space dock when entering a Space route', async () => {
    mocks.pathname = '/spaces'
    mocks.params = new Map([['space', 'space-1']])

    render(<ShellWorkspace>Space page</ShellWorkspace>)

    await waitFor(() => {
      expect(mocks.setSpaceWorkOpen).toHaveBeenCalledWith(true)
    })
  })
})
