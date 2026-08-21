'use client'

import Image from 'next/image'

const GOOGLE_ACTION_CLASS =
  'button-glass-neutral body-3 gap-spacing-2 px-spacing-3 py-spacing-2 inline-flex items-center whitespace-nowrap'

function GoogleDocsMark() {
  return (
    <Image
      src="/Integrations/GoogleDocs.png"
      alt=""
      width={16}
      height={16}
      unoptimized
      className="icon-sm shrink-0 object-contain"
    />
  )
}

export function DocEditorGoogleHeaderAction({
  savedGoogleDocHref,
  creating,
  onExport,
}: {
  savedGoogleDocHref: string | null
  creating: boolean
  onExport: () => void
}) {
  if (savedGoogleDocHref) {
    return (
      <a
        href={savedGoogleDocHref}
        target="_blank"
        rel="noopener noreferrer"
        className={GOOGLE_ACTION_CLASS}
        aria-label="Open Google Doc"
      >
        <GoogleDocsMark />
        <span>Open Google Doc</span>
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={onExport}
      disabled={creating}
      className={GOOGLE_ACTION_CLASS}
      aria-label="Export to Google Docs"
    >
      <GoogleDocsMark />
      <span>{creating ? 'Creating…' : 'Export to Google Docs'}</span>
    </button>
  )
}
