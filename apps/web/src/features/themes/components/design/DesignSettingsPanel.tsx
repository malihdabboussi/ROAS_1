'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import type { DesignSettings, SpacingSettings, TypographySettings } from '../../types'
import { BlocksContentTab } from './BlocksContentTab'
import { ButtonsLinksTab } from './ButtonsLinksTab'
import { SlidesDesignTab } from './SlidesDesignTab'
import { SpacingTab } from './SpacingTab'
import { TypographyTab } from './TypographyTab'

interface DesignSettingsPanelProps {
  value: DesignSettings
  onChange: (value: DesignSettings) => void
}

export function DesignSettingsPanel({ value, onChange }: DesignSettingsPanelProps) {
  const updateSlides = (slides: DesignSettings['slides']) => onChange({ ...value, slides })
  const updateBlocks = (blocks: DesignSettings['blocks']) => onChange({ ...value, blocks })
  const updateButtons = (buttons: DesignSettings['buttons']) => onChange({ ...value, buttons })
  const updateLinks = (links: DesignSettings['links']) => onChange({ ...value, links })
  const updateSpacing = (spacing: SpacingSettings) => onChange({ ...value, spacing })
  const updateTypography = (typography: TypographySettings) => onChange({ ...value, typography })

  return (
    <div className="@container space-y-spacing-4 sm:space-y-spacing-6 max-w-xl">
      <div>
        <h3 className="body-1 text-foreground font-semibold">Design Elements</h3>
        <p className="typo-caption text-muted-foreground mt-spacing-1">
          Precise control for cards, blocks, buttons, links, spacing, and typography.
        </p>
      </div>

      <Tabs defaultValue="slides" className="space-y-spacing-4">
        <TabsList
          variant="liquid"
          className="gap-spacing-1 @[520px]:!flex @[520px]:h-9 @[520px]:!flex-nowrap !grid h-auto w-full grid-cols-3"
        >
          <TabsTrigger
            value="slides"
            className="px-spacing-4 @[520px]:w-auto @[520px]:flex-1 w-full"
          >
            Slides
          </TabsTrigger>
          <TabsTrigger
            value="blocks"
            className="px-spacing-4 @[520px]:w-auto @[520px]:flex-1 w-full"
          >
            Blocks & content
          </TabsTrigger>
          <TabsTrigger
            value="buttons"
            className="px-spacing-4 @[520px]:w-auto @[520px]:flex-1 w-full"
          >
            Buttons & links
          </TabsTrigger>
          <TabsTrigger
            value="spacing"
            className="px-spacing-4 @[520px]:w-auto @[520px]:flex-1 w-full"
          >
            Spacing
          </TabsTrigger>
          <TabsTrigger
            value="typography"
            className="px-spacing-4 @[520px]:w-auto @[520px]:flex-1 w-full"
          >
            Typography
          </TabsTrigger>
        </TabsList>

        <TabsContent value="slides">
          <SlidesDesignTab value={value.slides} onChange={updateSlides} />
        </TabsContent>
        <TabsContent value="blocks">
          <BlocksContentTab value={value.blocks} onChange={updateBlocks} />
        </TabsContent>
        <TabsContent value="buttons">
          <ButtonsLinksTab
            buttons={value.buttons}
            links={value.links}
            onChangeButtons={updateButtons}
            onChangeLinks={updateLinks}
          />
        </TabsContent>
        <TabsContent value="spacing">
          <SpacingTab value={value.spacing} onChange={updateSpacing} />
        </TabsContent>
        <TabsContent value="typography">
          <TypographyTab value={value.typography} onChange={updateTypography} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
