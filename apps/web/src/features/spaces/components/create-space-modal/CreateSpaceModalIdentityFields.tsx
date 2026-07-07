import { getIconColor, IconPicker, LucideIcon, type IconColorId } from '@/components/ui/IconPicker'

interface CreateSpaceModalIdentityFieldsProps {
  title: string
  description: string
  spaceIcon: string
  iconColor: IconColorId
  nameError: string | null
  submitting: boolean
  onTitleChange: (title: string) => void
  onDescriptionChange: (description: string) => void
  onSpaceIconChange: (iconName: string) => void
  onIconColorChange: (colorId: IconColorId) => void
  onSubmit: () => void
}

export function CreateSpaceModalIdentityFields({
  title,
  description,
  spaceIcon,
  iconColor,
  nameError,
  submitting,
  onTitleChange,
  onDescriptionChange,
  onSpaceIconChange,
  onIconColorChange,
  onSubmit,
}: CreateSpaceModalIdentityFieldsProps) {
  const iconPalette = getIconColor(iconColor)

  return (
    <>
      <div className="space-y-spacing-2">
        <label htmlFor="create-space-name" className="body-2 text-foreground block font-medium">
          Icon &amp; name
        </label>
        <div className="gap-spacing-2 flex items-center">
          <IconPicker
            value={spaceIcon}
            color={iconColor}
            onChange={onSpaceIconChange}
            onColorChange={onIconColorChange}
            size="sm"
            disabled={submitting}
            className="shrink-0"
            customTrigger={
              <span
                className={`border-border rounded-spacing-2 inline-flex h-spacing-9 w-9 shrink-0 items-center justify-center border ${iconPalette.glassClass}`}
              >
                <LucideIcon name={spaceIcon} className={`h-4 w-4 ${iconPalette.textColor}`} />
              </span>
            }
          />
          <input
            id="create-space-name"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSubmit()
              }
            }}
            placeholder="e.g. Marketing, Engineering, HR"
            autoFocus
            maxLength={500}
            aria-invalid={nameError != null}
            aria-describedby={nameError ? 'create-space-name-error' : undefined}
            className={`border-border bg-background body-3 text-foreground placeholder:text-muted-foreground focus:ring-ring rounded-spacing-2 px-spacing-3 h-spacing-9 min-w-0 flex-1 border outline-none focus:ring-2 ${nameError ? 'border-destructive focus:ring-destructive' : ''}`}
          />
        </div>
        {nameError ? (
          <p id="create-space-name-error" className="body-4 text-destructive" role="alert">
            {nameError}
          </p>
        ) : null}
      </div>

      <div className="space-y-spacing-2">
        <label htmlFor="create-space-desc" className="body-2 text-foreground block font-medium">
          Description <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          id="create-space-desc"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          maxLength={2000}
          className="border-border bg-background body-3 text-foreground placeholder:text-muted-foreground focus:ring-ring rounded-spacing-2 px-spacing-3 h-spacing-9 w-full border outline-none focus:ring-2"
        />
      </div>
    </>
  )
}
