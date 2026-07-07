import { CheckCircle, Layout, Palette, Star, Type } from 'lucide-react'
import type { ThemePreviewSectionsProps, ThemePreviewStyleProps } from './ThemePreviewSections.types'

// This preview mirrors user-selected theme values through inline CSS variables/styles by design.
type ThemePreviewShowcaseSectionsProps = Pick<ThemePreviewSectionsProps, 'colors'> &
  ThemePreviewStyleProps

export function ThemePreviewShowcaseSections({
  colors,
  blockCardStyles,
  buttonStyles,
  headingFont,
  bodyFont,
}: ThemePreviewShowcaseSectionsProps) {
  return (
    <>
      <ThemePreviewHeroSection
        headingFont={headingFont}
        bodyFont={bodyFont}
        buttonStyles={buttonStyles}
      />
      <ThemePreviewPaletteSection
        colors={colors}
        blockCardStyles={blockCardStyles}
        headingFont={headingFont}
        bodyFont={bodyFont}
      />
      <ThemePreviewFormSection
        blockCardStyles={blockCardStyles}
        buttonStyles={buttonStyles}
        headingFont={headingFont}
        bodyFont={bodyFont}
      />
    </>
  )
}

function ThemePreviewHeroSection({
  headingFont,
  bodyFont,
  buttonStyles,
}: Pick<ThemePreviewStyleProps, 'headingFont' | 'bodyFont' | 'buttonStyles'>) {
  return (
    <section className="py-spacing-12 px-spacing-6 text-center">
      <div className="mb-spacing-4 flex justify-center">
        <span
          className="gap-spacing-1 px-spacing-3 py-spacing-1 body-3 inline-flex items-center rounded-full font-medium"
          style={{
            backgroundColor: 'var(--color-secondary-accent-1)',
            color: 'var(--color-primary-foreground)',
          }}
        >
          <Star className="h-3.5 w-3.5" />
          Theme Preview
        </span>
      </div>

      <h1
        className="title-h2 mb-spacing-3 font-bold"
        style={{ color: 'var(--color-heading)', ...headingFont }}
      >
        THIS IS YOUR PAGE THEME
      </h1>
      <p
        className="title-h4 mb-spacing-6 mx-auto max-w-md"
        style={{ color: 'var(--color-body)', ...bodyFont }}
      >
        Here's how your colors and settings apply to funnel pages. Every element adapts to your
        choices.
      </p>

      <div className="gap-spacing-3 flex flex-col items-center justify-center sm:flex-row">
        <button
          className="px-spacing-6 py-spacing-3 body-2 font-medium transition-opacity hover:opacity-90"
          style={{
            background: 'var(--color-primary)',
            color: 'var(--color-primary-foreground)',
            ...buttonStyles,
          }}
        >
          Primary Button
        </button>
        <button
          className="px-spacing-6 py-spacing-3 body-2 font-medium transition-opacity hover:opacity-90"
          style={{
            background: 'var(--color-secondary-accent-1)',
            color: 'var(--color-primary-foreground)',
            ...buttonStyles,
          }}
        >
          Secondary Button
        </button>
      </div>
    </section>
  )
}

function ThemePreviewPaletteSection({
  colors,
  blockCardStyles,
  headingFont,
  bodyFont,
}: Pick<
  ThemePreviewSectionsProps,
  'colors' | 'blockCardStyles' | 'headingFont' | 'bodyFont'
>) {
  const paletteItems = [
    {
      icon: Palette,
      title: 'Primary Accent',
      description: 'Used for buttons, links, and key actions',
      color: colors.primary,
    },
    {
      icon: Type,
      title: 'Heading Color',
      description: 'Makes your headlines stand out',
      color: colors.heading,
    },
    {
      icon: Layout,
      title: 'Card Background',
      description: 'Creates visual containers for content',
      color: colors.cardBackground,
    },
  ]

  return (
    <section className="py-spacing-12 px-spacing-6">
      <h2
        className="title-h3 mb-spacing-8 text-center font-bold"
        style={{ color: 'var(--color-heading)', ...headingFont }}
      >
        YOUR COLOR PALETTE
      </h2>
      <div className="gap-spacing-4 mx-auto grid max-w-2xl grid-cols-1">
        {paletteItems.map((item, index) => (
          <div key={item.title} className="p-spacing-4" style={blockCardStyles}>
            <div className="gap-spacing-3 flex items-start">
              <div
                className="rounded-spacing-1 flex h-10 w-10 flex-shrink-0 items-center justify-center"
                style={{ backgroundColor: item.color }}
              >
                <item.icon
                  className="h-5 w-5"
                  style={{ color: 'var(--color-primary-foreground)' }}
                />
              </div>
              <div className="flex-1">
                <h3
                  className="body-1 mb-spacing-1 font-semibold"
                  style={{ color: 'var(--color-heading)', ...headingFont }}
                >
                  {item.title}
                </h3>
                <p className="body-3" style={{ color: 'var(--color-body)', ...bodyFont }}>
                  {item.description}
                </p>
              </div>
              {index === 0 && (
                <span
                  className="px-spacing-2 rounded-spacing-1 typo-caption py-0.5 font-medium"
                  style={{
                    backgroundColor: 'var(--color-secondary-accent-1)',
                    color: 'var(--color-primary-foreground)',
                  }}
                >
                  Main
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ThemePreviewFormSection({
  blockCardStyles,
  buttonStyles,
  headingFont,
  bodyFont,
}: ThemePreviewStyleProps) {
  return (
    <section className="py-spacing-12 px-spacing-6">
      <div className="p-spacing-6 mx-auto max-w-md" style={blockCardStyles}>
        <h2
          className="title-h4 mb-spacing-2 text-center font-bold"
          style={{ color: 'var(--color-heading)', ...headingFont }}
        >
          FORM ELEMENTS
        </h2>
        <p
          className="body-3 mb-spacing-4 text-center"
          style={{ color: 'var(--color-body)', ...bodyFont }}
        >
          Input fields use your input and border colors.
        </p>

        <div className="mb-spacing-6 space-y-spacing-2">
          {[
            'Input background adapts to your theme',
            'Border color creates subtle definition',
            'Primary color highlights focus states',
          ].map((feature) => (
            <div key={feature} className="gap-spacing-2 flex items-center">
              <CheckCircle
                className="h-4 w-4 flex-shrink-0"
                style={{ color: 'var(--color-secondary-accent-2)' }}
              />
              <span className="body-3" style={{ color: 'var(--color-body)', ...bodyFont }}>
                {feature}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-spacing-3">
          <input
            type="text"
            placeholder="Your name"
            className="preview-input px-spacing-3 py-spacing-2 body-3 rounded-spacing-1 w-full"
            style={{
              backgroundColor: 'var(--color-input)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-body)',
            }}
          />
          <input
            type="email"
            placeholder="Your email"
            className="preview-input px-spacing-3 py-spacing-2 body-3 rounded-spacing-1 w-full"
            style={{
              backgroundColor: 'var(--color-input)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-body)',
            }}
          />
          <button
            className="px-spacing-6 py-spacing-3 body-2 w-full font-medium transition-opacity hover:opacity-90"
            style={{
              background: 'var(--color-primary)',
              color: 'var(--color-primary-foreground)',
              ...buttonStyles,
            }}
          >
            Submit Form
          </button>

          <button
            className="px-spacing-6 py-spacing-2 body-3 w-full font-medium transition-opacity hover:opacity-80"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--color-secondary-accent-2)',
              color: 'var(--color-secondary-accent-2)',
              borderRadius: buttonStyles.borderRadius,
            }}
          >
            Outline Style
          </button>
        </div>
      </div>
    </section>
  )
}
