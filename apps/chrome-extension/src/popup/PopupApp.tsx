import { useEffect } from 'react'

export function PopupApp() {
  useEffect(() => {
    chrome.windows.getCurrent((w) => {
      if (w.id != null) void chrome.sidePanel.open({ windowId: w.id })
    })
    const t = window.setTimeout(() => window.close(), 200)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className="surface-bg p-spacing-3">
      <p className="body-3 text-muted" style={{ margin: 0 }}>
        Opening side panel…
      </p>
    </div>
  )
}
