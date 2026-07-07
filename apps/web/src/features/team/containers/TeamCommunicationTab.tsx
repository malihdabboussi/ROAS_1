'use client'

import { useState } from 'react'
import { AgentWidgetSection } from './AgentWidgetSection'
import { CommsSectionHeader } from './team-communication-tab/CommsSectionHeader'
import { TeamCommunicationChannelsSection } from './team-communication-tab/TeamCommunicationChannelsSection'
import { TeamCommunicationDigestSection } from './team-communication-tab/TeamCommunicationDigestSection'
import { TeamCommunicationModelVoiceSection } from './team-communication-tab/TeamCommunicationModelVoiceSection'
import { TeamCommunicationStyleSection } from './team-communication-tab/TeamCommunicationStyleSection'
import type {
  CommsSectionKey,
  TeamCommunicationTabProps,
} from './team-communication-tab/team-communication-tab.types'

export { PublicPageSection } from './team-communication-tab/PublicPageSection'

export function TeamCommunicationTab(props: TeamCommunicationTabProps) {
  const { selected } = props
  const [sectionCollapsed, setSectionCollapsed] = useState<
    Partial<Record<CommsSectionKey, boolean>>
  >({})

  if (!selected) return null

  const isReadOnly = props.disabled === true
  const toggleCommsSection = (key: CommsSectionKey) => {
    setSectionCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="flex flex-col px-spacing-1">
      <TeamCommunicationModelVoiceSection
        selected={selected}
        selectedModelId={props.selectedModelId}
        modelOptions={props.modelOptions}
        communicationSaving={props.communicationSaving}
        modelDropdownOpen={props.modelDropdownOpen}
        setModelDropdownOpen={props.setModelDropdownOpen}
        modelDropdownRef={props.modelDropdownRef}
        modelDropdownBtnRef={props.modelDropdownBtnRef}
        modelDropdownPos={props.modelDropdownPos}
        handleCommunicationStrategyChange={props.handleCommunicationStrategyChange}
        handleCommunicationModelChange={props.handleCommunicationModelChange}
        handleVoiceChange={props.handleVoiceChange}
        collapsed={sectionCollapsed.modelVoice === true}
        onToggle={() => toggleCommsSection('modelVoice')}
        isReadOnly={isReadOnly}
      />

      <TeamCommunicationStyleSection
        selected={selected}
        communicationSaving={props.communicationSaving}
        communicationError={props.communicationError}
        handleCommunicationStyleChange={props.handleCommunicationStyleChange}
        collapsed={sectionCollapsed.communication === true}
        onToggle={() => toggleCommsSection('communication')}
        isReadOnly={isReadOnly}
      />

      {selected.level !== 'system' ? (
        <>
          <TeamCommunicationChannelsSection
            selected={selected}
            channelsLoading={props.channelsLoading}
            channels={props.channels}
            setChannels={props.setChannels}
            channelDisconnecting={props.channelDisconnecting}
            setChannelDisconnecting={props.setChannelDisconnecting}
            slackDisconnecting={props.slackDisconnecting}
            setSlackDisconnecting={props.setSlackDisconnecting}
            setShowTelegramSetup={props.setShowTelegramSetup}
            setShowSlackSetup={props.setShowSlackSetup}
            preferredChannel={props.preferredChannel}
            setPreferredChannel={props.setPreferredChannel}
            channelSaving={props.channelSaving}
            setChannelSaving={props.setChannelSaving}
            collapsed={sectionCollapsed.channels === true}
            onToggle={() => toggleCommsSection('channels')}
            isReadOnly={isReadOnly}
          />

          {selected.level === 'c_level' ? (
            <TeamCommunicationDigestSection
              selected={selected}
              digestEnabled={props.digestEnabled}
              setDigestEnabled={props.setDigestEnabled}
              digestSaving={props.digestSaving}
              setDigestSaving={props.setDigestSaving}
              digestTime={props.digestTime}
              setDigestTime={props.setDigestTime}
              digestDropdownOpen={props.digestDropdownOpen}
              setDigestDropdownOpen={props.setDigestDropdownOpen}
              digestDropdownBtnRef={props.digestDropdownBtnRef}
              digestDropdownPos={props.digestDropdownPos}
              collapsed={sectionCollapsed.dailySummary === true}
              onToggle={() => toggleCommsSection('dailySummary')}
              isReadOnly={isReadOnly}
            />
          ) : null}

          <CommsSectionHeader
            title="Website widget"
            collapsed={sectionCollapsed.websiteWidget === true}
            onToggle={() => toggleCommsSection('websiteWidget')}
            first={false}
          />
          {sectionCollapsed.websiteWidget !== true ? (
            <div className="px-spacing-2 pb-spacing-1">
              <AgentWidgetSection agent={selected} suppressTitle omitOuterSpacing />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
