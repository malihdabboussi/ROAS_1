interface AdSetMetaSourceBannerProps {
  appearance: 'studio' | 'spaces'
  metaAdSetId?: string | null
}

export function AdSetMetaSourceBanner({ appearance, metaAdSetId }: AdSetMetaSourceBannerProps) {
  const isSpaces = appearance === 'spaces'

  return (
    <div
      className={
        isSpaces
          ? 'border-primary/20 bg-primary/10 mx-spacing-4 mt-spacing-4 rounded-spacing-2 px-spacing-3 py-spacing-2 flex items-center gap-2 border'
          : 'border-primary/20 bg-primary/10 mx-5 mt-4 flex items-center gap-2 rounded-lg border px-3 py-2'
      }
    >
      <span
        aria-hidden="true"
        className="bg-primary/15 text-primary flex h-5 w-5 flex-shrink-0 items-center justify-center rounded body-4 font-bold"
      >
        M
      </span>
      <span className="typo-caption text-muted-foreground flex-1">
        Synced from Meta{metaAdSetId ? ` · ID ${metaAdSetId}` : ''}
      </span>
    </div>
  )
}
