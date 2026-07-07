'use client'

import { useEffect } from 'react'
import Clarity from '@microsoft/clarity'

const CLARITY_PROJECT_ID = 'wayiwcwn7a'

export function MicrosoftClarity() {
  useEffect(() => {
    Clarity.init(CLARITY_PROJECT_ID)
  }, [])

  return null
}
