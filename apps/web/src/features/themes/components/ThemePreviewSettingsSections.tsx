import type { ThemePreviewSectionsProps, ThemePreviewStyleProps } from './ThemePreviewSections.types'

// This preview mirrors user-selected theme values through inline CSS variables/styles by design.
type ThemePreviewSettingsSectionsProps = Pick<ThemePreviewSectionsProps, 'settings'> &
  ThemePreviewStyleProps

const BORDER_RADIUS_LABELS: Record<string, string> = {
  none: 'None',
  sm: 'Small',
  md: 'Medium',
  lg: 'Large',
  xl: 'Extra Large',
}

const SHADOW_LABELS: Record<string, string> = {
  none: 'None',
  sm: 'Subtle',
  md: 'Medium',
  lg: 'Strong',
}

const BUTTON_SHAPE_LABELS: Record<string, string> = {
  square: 'Square',
  'rounded-sm': 'Slightly Rounded',
  rounded: 'Rounded',
  pill: 'Pill',
}

export function ThemePreviewSettingsSections({
  settings,
  blockCardStyles,
  buttonStyles,
  headingFont,
  bodyFont,
}: ThemePreviewSettingsSectionsProps) {
  return (
    <>
      <ThemePreviewDesignSettingsSection
        settings={settings}
        blockCardStyles={blockCardStyles}
        headingFont={headingFont}
        bodyFont={bodyFont}
      />
      <ThemePreviewClosingSection
        blockCardStyles={blockCardStyles}
        buttonStyles={buttonStyles}
        headingFont={headingFont}
        bodyFont={bodyFont}
      />
    </>
  )
}

function ThemePreviewDesignSettingsSection({
  settings,
  blockCardStyles,
  headingFont,
  bodyFont,
}: Pick<
  ThemePreviewSectionsProps,
  'settings' | 'blockCardStyles' | 'headingFont' | 'bodyFont'
>) {
  const settingItems = [
    {
      label: 'Block Corners',
      value: BORDER_RADIUS_LABELS[settings.blocks.borderRadius] || settings.blocks.borderRadius,
      description: 'How rounded your content blocks appear',
    },
    {
      label: 'Block Shadow',
      value: SHADOW_LABELS[settings.blocks.shadow] || settings.blocks.shadow,
      description: 'Depth and elevation effect',
    },
    {
      label: 'Button Shape',
      value: BUTTON_SHAPE_LABELS[settings.buttons.shape] || settings.buttons.shape,
      description: 'From square to pill-shaped',
    },
  ]

  return (
    <section className="py-spacing-12 px-spacing-6">
      <h2
        className="title-h3 mb-spacing-6 text-center font-bold"
        style={{ color: 'var(--color-heading)', ...headingFont }}
      >
        DESIGN SETTINGS
      </h2>
      <p
        className="body-2 mb-spacing-8 mx-auto max-w-md text-center"
        style={{ color: 'var(--color-body)', ...bodyFont }}
      >
        Your card and button settings create a consistent look across all elements.
      </p>
      <div className="space-y-spacing-3 mx-auto max-w-2xl">
        {settingItems.map((setting) => (
          <div key={setting.label} className="p-spacing-4" style={blockCardStyles}>
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className="body-2 mb-spacing-1 font-medium"
                  style={{ color: 'var(--color-heading)', ...headingFont }}
                >
                  {setting.label}
                </h3>
                <p className="body-3" style={{ color: 'var(--color-body)', ...bodyFont }}>
                  {setting.description}
                </p>
              </div>
              <span
                className="px-spacing-3 py-spacing-1 rounded-spacing-1 body-3 font-medium"
                style={{
                  backgroundColor: 'var(--color-secondary-accent-2)',
                  color: 'var(--color-primary-foreground)',
                }}
              >
                {setting.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ThemePreviewClosingSection({
  blockCardStyles,
  buttonStyles,
  headingFont,
  bodyFont,
}: ThemePreviewStyleProps) {
  return (
    <section className="py-spacing-12 px-spacing-6 text-center">
      <div className="p-spacing-6 mx-auto max-w-md" style={blockCardStyles}>
        <h2
          className="title-h3 mb-spacing-3 font-bold"
          style={{ color: 'var(--color-heading)', ...headingFont }}
        >
          THAT'S YOUR THEME!
        </h2>
        <p className="body-2 mb-spacing-6" style={{ color: 'var(--color-body)', ...bodyFont }}>
          Every funnel page you create will use these colors and settings. Your brand stays
          consistent across all your pages.
        </p>
        <p
          className="body-3 mb-spacing-4"
          style={{ color: 'var(--color-body)', opacity: 0.7, ...bodyFont }}
        >
          We hope you enjoy your Vibey experience 💜
        </p>
        <button
          className="px-spacing-8 py-spacing-3 body-2 font-medium transition-opacity hover:opacity-90"
          style={{
            background: 'var(--color-primary)',
            color: 'var(--color-primary-foreground)',
            ...buttonStyles,
          }}
        >
          Save Theme
        </button>
      </div>
    </section>
  )
}
