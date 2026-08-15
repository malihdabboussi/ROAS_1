'use client'

import type { ReactNode } from 'react'
import { ShellChatMenu } from '@/components/shell/ShellChatMenu'

export function SidebarSimpleRecents({ navigation }: { navigation: ReactNode }) {
  return <ShellChatMenu navigationSlot={navigation} simpleSidebar />
}
