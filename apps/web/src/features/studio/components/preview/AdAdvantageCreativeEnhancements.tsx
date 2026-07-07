import { Switch } from '@/components/ui/forms/switch'

const ADVANTAGE_ENHANCEMENTS = [
  {
    key: 'video_touchups',
    label: 'Video touch-ups',
    desc: 'Auto-adjust video quality and framing',
  },
  {
    key: 'text_improvements',
    label: 'Text improvements',
    desc: 'Optimize ad text for each person',
  },
  { key: 'enhance_cta', label: 'Enhance CTA', desc: 'Show the most relevant call to action' },
  {
    key: 'image_enhancements',
    label: 'Image brightness & contrast',
    desc: 'Auto-adjust image visuals',
  },
  { key: 'music', label: 'Music', desc: 'Add background music to your ad' },
  { key: '3d_animation', label: '3D animation', desc: 'Add subtle motion to static images' },
]

interface AdAdvantageCreativeEnhancementsProps {
  enhancements: Record<string, boolean>
  customizeOpen: boolean
  onSetCustomizeOpen: (open: boolean) => void
  onSaveEnhancements: (enhancements: Record<string, boolean>) => void
}

export function AdAdvantageCreativeEnhancements({
  enhancements,
  customizeOpen,
  onSetCustomizeOpen,
  onSaveEnhancements,
}: AdAdvantageCreativeEnhancementsProps) {
  const activeCount = ADVANTAGE_ENHANCEMENTS.filter((enhancement) => {
    return enhancements[enhancement.key] !== false
  }).length

  const toggleEnhancement = (key: string, on: boolean) => {
    onSaveEnhancements({ ...enhancements, [key]: on })
  }

  const toggleAll = (on: boolean) => {
    const next: Record<string, boolean> = {}
    ADVANTAGE_ENHANCEMENTS.forEach((enhancement) => {
      next[enhancement.key] = on
    })
    onSaveEnhancements(next)
  }

  return (
    <div className="rounded-spacing-2 border-border bg-card p-spacing-4 border">
      <p className="typo-caption text-muted-foreground mb-1 font-semibold uppercase tracking-wider">
        Advantage+ creative enhancements
      </p>
      <p className="typo-caption text-muted-foreground -mt-2 mb-4">
        Meta can automatically optimize your creative to improve performance.
      </p>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="body-3 text-foreground font-medium">
            Turned on: {activeCount}/{ADVANTAGE_ENHANCEMENTS.length}
          </span>
          <button
            type="button"
            onClick={() => onSetCustomizeOpen(!customizeOpen)}
            className="body-3 text-primary hover:text-primary/80 font-medium transition-colors"
          >
            {customizeOpen ? 'Done' : 'Customize'}
          </button>
        </div>
        {customizeOpen && (
          <div className="space-y-1">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => toggleAll(activeCount < ADVANTAGE_ENHANCEMENTS.length)}
                className="typo-caption text-primary hover:text-primary/80 font-medium transition-colors"
              >
                {activeCount === ADVANTAGE_ENHANCEMENTS.length ? 'Turn all off' : 'Turn all on'}
              </button>
            </div>
            {ADVANTAGE_ENHANCEMENTS.map((enhancement) => {
              const on = enhancements[enhancement.key] !== false
              return (
                <div
                  key={enhancement.key}
                  className="flex items-center justify-between rounded-lg px-1 py-1.5"
                >
                  <div>
                    <p className="body-3 text-foreground">{enhancement.label}</p>
                    <p className="typo-caption text-muted-foreground">{enhancement.desc}</p>
                  </div>
                  <Switch
                    checked={on}
                    onCheckedChange={(checked) => toggleEnhancement(enhancement.key, checked)}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
