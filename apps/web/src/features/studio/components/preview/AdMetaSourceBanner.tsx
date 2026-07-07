interface AdMetaSourceBannerProps {
  metaAdId?: string | null
}

export function AdMetaSourceBanner({ metaAdId }: AdMetaSourceBannerProps) {
  return (
    <div className="mx-spacing-5 mt-spacing-4 gap-spacing-2 rounded-spacing-2 border-primary/20 bg-primary/10 px-spacing-3 py-spacing-2 flex items-center border">
      <span
        aria-hidden="true"
        className="h-spacing-5 w-spacing-5 rounded-spacing-1 bg-primary/15 body-4 text-primary flex flex-shrink-0 items-center justify-center font-bold"
      >
        M
      </span>
      <span className="typo-caption text-muted-foreground flex-1">
        Synced from Meta{metaAdId ? ` · ID ${metaAdId}` : ''}
      </span>
    </div>
  )
}
