'use client'

import { HomeShell } from '@/features/home'

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <HomeShell>{children}</HomeShell>
}
