'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function OnboardingSwitchAccountButton() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSwitchAccount = () => {
    void (async () => {
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.replace('/login')
    })()
  }

  if (!mounted) return null

  return createPortal(
    <button
      type="button"
      onClick={handleSwitchAccount}
      className="button-glass-neutral body-3 gap-spacing-2 px-spacing-4 py-spacing-2 z-dropdown right-spacing-6 top-spacing-6 pointer-events-auto fixed flex items-center rounded-full font-medium"
    >
      <LogOut className="icon-sm" />
      Use another account
    </button>,
    document.body,
  )
}
