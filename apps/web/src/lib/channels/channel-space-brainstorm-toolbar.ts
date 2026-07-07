/** Lets the Spaces channel toolbar open the brainstorm modal or a thread inside the mounted `ChannelChatContainer`. */

const REGISTRY_KEY = '__vibeySpaceChannelBrainstormHandlers__'

export type SpaceChannelBrainstormHandlers = {
  openCreateModal: () => void
  openThread: (parentMessageId: string) => void
}

type HandlersMap = Map<string, SpaceChannelBrainstormHandlers>

function getRegistry(): HandlersMap {
  const g = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: HandlersMap
  }
  if (!g[REGISTRY_KEY]) g[REGISTRY_KEY] = new Map<string, SpaceChannelBrainstormHandlers>()
  return g[REGISTRY_KEY]
}

export function registerSpaceChannelBrainstormHandlers(
  channelId: string,
  handlers: SpaceChannelBrainstormHandlers,
) {
  getRegistry().set(channelId, handlers)
}

export function unregisterSpaceChannelBrainstormHandlers(
  channelId: string,
  handlers: SpaceChannelBrainstormHandlers,
) {
  const registry = getRegistry()
  if (registry.get(channelId) === handlers) registry.delete(channelId)
}

export function triggerSpaceChannelBrainstormCreate(channelId: string | null | undefined) {
  if (!channelId) return
  getRegistry().get(channelId)?.openCreateModal()
}

export function triggerSpaceChannelBrainstormThread(
  channelId: string | null | undefined,
  parentMessageId: string,
) {
  if (!channelId) return
  getRegistry().get(channelId)?.openThread(parentMessageId)
}

/** Opens the start-brainstorm modal. */
export function triggerSpaceChannelBrainstorm(channelId: string | null | undefined) {
  triggerSpaceChannelBrainstormCreate(channelId)
}
