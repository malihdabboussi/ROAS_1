export function ChatInputCreditsExhaustedNotice({ composerPadX }: { composerPadX: string }) {
  return (
    <div className={`flex items-center gap-2 ${composerPadX} pt-spacing-2`}>
      <span className="body-3 text-destructive">
        You&apos;ve run out of credits —{' '}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-credit-purchase'))
          }}
          className="font-medium underline hover:opacity-80"
        >
          buy more
        </button>
      </span>
    </div>
  )
}

export function ChatInputDragOverlay({
  wrapperClass,
  roundedClass,
}: {
  wrapperClass?: string
  roundedClass: string
}) {
  return (
    <div
      className={`bg-background/80 pointer-events-none absolute inset-0 z-10 flex items-center justify-center ${
        wrapperClass ? '' : roundedClass
      } border-primary border border-dashed`}
    >
      <span className="body-2 text-foreground font-medium">Drop your file</span>
    </div>
  )
}
