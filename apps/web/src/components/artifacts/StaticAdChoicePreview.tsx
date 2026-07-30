import { cn } from '@/lib/utils/cn'

const PERSON_FORMATS = new Set([
  'person',
  'hero_framing',
  'identity_callout',
  'case_study',
  'workshop_event',
])
const RECEIPT_FORMATS = new Set(['receipt', 'tweet_receipt', 'chat_receipt', 'press_authority'])
const GRAPHIC_FORMATS = new Set(['graphic', 'fake_news', 'myth_vs_system', 'offer_stack'])

export function StaticAdChoicePreview({
  choiceId,
  className,
}: {
  choiceId: string
  className?: string
}) {
  const kind = resolvePreviewKind(choiceId)
  if (!kind) return null

  return (
    <div
      aria-label={`${previewLabel(kind)} example`}
      className={cn(
        'border-border bg-background mt-spacing-2 rounded-spacing-2 p-spacing-2 h-spacing-16 overflow-hidden border',
        className,
      )}
    >
      {kind === 'validate' ? <ValidateMessagingPreview /> : null}
      {kind === 'brief' ? <ImageBriefPreview /> : null}
      {kind === 'person' ? <PersonLedPreview /> : null}
      {kind === 'receipt' ? <ReceiptPreview /> : null}
      {kind === 'graphic' ? <GraphicPreview /> : null}
    </div>
  )
}

function resolvePreviewKind(choiceId: string) {
  if (choiceId === 'validate_messaging') return 'validate'
  if (choiceId === 'image_brief') return 'brief'
  if (choiceId === 'static_ad_book') return 'graphic'
  if (PERSON_FORMATS.has(choiceId)) return 'person'
  if (RECEIPT_FORMATS.has(choiceId)) return 'receipt'
  if (GRAPHIC_FORMATS.has(choiceId)) return 'graphic'
  return null
}

function previewLabel(kind: string) {
  if (kind === 'validate') return 'Validate Messaging'
  if (kind === 'brief') return 'Image Brief'
  if (kind === 'person') return 'Person-led ad'
  if (kind === 'receipt') return 'Proof and authority ad'
  return 'Static Ad Book'
}

function ValidateMessagingPreview() {
  return (
    <div className="gap-spacing-1 flex h-full flex-col justify-center">
      <div className="bg-secondary rounded-spacing-1 h-spacing-1 w-full" />
      <div className="bg-primary rounded-spacing-1 h-spacing-2 w-full" />
      <div className="bg-secondary rounded-spacing-1 h-spacing-1 w-full" />
    </div>
  )
}

function ImageBriefPreview() {
  return (
    <div className="gap-spacing-2 grid h-full grid-cols-2">
      <div className="bg-secondary rounded-spacing-1" />
      <div className="gap-spacing-1 flex flex-col justify-center">
        <div className="bg-foreground rounded-spacing-1 h-spacing-1 w-full" />
        <div className="bg-muted rounded-spacing-1 h-spacing-1 w-full" />
        <div className="bg-primary rounded-spacing-1 h-spacing-2 w-full" />
      </div>
    </div>
  )
}

function PersonLedPreview() {
  return (
    <div className="gap-spacing-2 flex h-full items-center">
      <div className="bg-secondary h-spacing-10 w-spacing-10 shrink-0 rounded-full" />
      <div className="gap-spacing-1 flex flex-1 flex-col">
        <div className="bg-foreground rounded-spacing-1 h-spacing-1 w-full" />
        <div className="bg-muted rounded-spacing-1 h-spacing-1 w-full" />
        <div className="bg-primary rounded-spacing-1 h-spacing-2 w-full" />
      </div>
    </div>
  )
}

function ReceiptPreview() {
  return (
    <div className="gap-spacing-1 flex h-full flex-col justify-center">
      <div className="bg-secondary rounded-spacing-2 p-spacing-1 mr-spacing-4">
        <div className="bg-muted rounded-spacing-1 h-spacing-1 w-full" />
      </div>
      <div className="bg-primary/10 rounded-spacing-2 p-spacing-1 ml-spacing-4">
        <div className="bg-primary rounded-spacing-1 h-spacing-1 w-full" />
      </div>
    </div>
  )
}

function GraphicPreview() {
  return (
    <div className="gap-spacing-1 flex h-full flex-col">
      <div className="bg-foreground rounded-spacing-1 h-spacing-2 w-full" />
      <div className="gap-spacing-1 grid flex-1 grid-cols-2">
        <div className="border-destructive/30 bg-destructive/10 rounded-spacing-1 border" />
        <div className="border-success/30 bg-success/10 rounded-spacing-1 border" />
      </div>
      <div className="bg-primary rounded-spacing-1 h-spacing-2 w-full" />
    </div>
  )
}
