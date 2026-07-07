'use client'

import { useCallback } from 'react'
import {
  AddPeopleToChannelModal as SharedAddPeopleToChannelModal,
  type AddPeopleToChannelModalProps,
} from '@/components/channels/AddPeopleToChannelModal'
import { addRosterEntriesToChannel } from '@/lib/channels/add-channel-members'
import { useAddPeopleRoster } from '@/lib/channels/use-add-people-roster'

export {
  channelMembersToRosterKeys,
  type AddPeopleToChannelPurpose,
} from '@/components/channels/AddPeopleToChannelModal'

export function AddPeopleToChannelModal({
  open,
  channel,
  onAddMembers: _onAddMembers,
  ...props
}: Omit<AddPeopleToChannelModalProps, 'roster' | 'currentUserId' | 'workspaceName' | 'onAddMembers'> &
  Partial<Pick<AddPeopleToChannelModalProps, 'onAddMembers'>>) {
  const { currentUserId, roster, workspaceName } = useAddPeopleRoster(open)
  const handleAddMembers = useCallback(
    async (entries: Parameters<AddPeopleToChannelModalProps['onAddMembers']>[0]) => {
      if (_onAddMembers) {
        await _onAddMembers(entries)
        return
      }
      if (!channel) return
      await addRosterEntriesToChannel(channel.id, entries)
    },
    [_onAddMembers, channel],
  )

  return (
    <SharedAddPeopleToChannelModal
      {...props}
      open={open}
      channel={channel}
      roster={roster}
      currentUserId={currentUserId}
      workspaceName={workspaceName}
      onAddMembers={handleAddMembers}
    />
  )
}
