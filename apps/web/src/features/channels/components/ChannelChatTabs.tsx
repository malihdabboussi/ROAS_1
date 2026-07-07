import type { ChannelChatActiveTab } from './channel-chat-utils'

const CHANNEL_CHAT_TABS: Array<{ key: ChannelChatActiveTab; label: string }> = [
  { key: 'messages', label: 'Messages' },
  { key: 'deliverables', label: 'Media / Deliverables' },
  { key: 'context', label: 'Context' },
]

export function ChannelChatTabs({
  activeTab,
  deliverableThreadFilter,
  onTabChange,
  onClearDeliverableFilter,
}: {
  activeTab: ChannelChatActiveTab
  deliverableThreadFilter?: string | null
  onTabChange: (tab: ChannelChatActiveTab) => void
  onClearDeliverableFilter?: () => void
}) {
  return (
    <div className="border-border shrink-0 border-b px-4 md:px-6">
      <div className="flex gap-4">
        {CHANNEL_CHAT_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              onTabChange(tab.key)
              if (tab.key === 'deliverables' && deliverableThreadFilter)
                onClearDeliverableFilter?.()
            }}
            className={`body-3 relative pb-2 font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="bg-primary absolute bottom-0 left-0 right-0 h-0.5 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
