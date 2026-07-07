'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

const MCP_OAUTH_REDIRECT_KEY = 'vibey_mcp_oauth_redirect_uri'
const REDIRECT_DELAY_MS = 1500

export default function McpSuccessPage() {
  const [redirectUri, setRedirectUri] = useState<string | null>(null)
  const [missingRedirect, setMissingRedirect] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem(MCP_OAUTH_REDIRECT_KEY)
    sessionStorage.removeItem(MCP_OAUTH_REDIRECT_KEY)
    if (!stored) {
      setMissingRedirect(true)
      return
    }
    setRedirectUri(stored)
    const timer = window.setTimeout(() => {
      window.location.replace(stored)
    }, REDIRECT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  if (missingRedirect) {
    return (
      <section className="surface-card rounded-spacing-4 border-border p-spacing-6 max-w-lg border text-center">
        <h1 className="title-h6 text-foreground">CONNECT VIBEY</h1>
        <p className="body-2 mt-spacing-3 text-muted-foreground">
          This connection link is no longer valid. Close this window and try connecting again from
          your app.
        </p>
      </section>
    )
  }

  return (
    <section className="surface-card rounded-spacing-4 border-border p-spacing-6 max-w-lg border text-center">
      <div className="h-spacing-10 w-spacing-10 bg-primary/10 mx-auto flex items-center justify-center rounded-full">
        <CheckCircle2 className="icon-lg text-primary" aria-hidden />
      </div>
      <h1 className="title-h6 text-foreground mt-spacing-4">CONNECTED SUCCESSFULLY</h1>
      <p className="body-2 mt-spacing-3 text-muted-foreground">
        Vibey is connected. You can close this window.
      </p>
      {redirectUri ? (
        <p className="body-4 mt-spacing-2 text-muted-foreground">Returning to your app&hellip;</p>
      ) : null}
    </section>
  )
}
