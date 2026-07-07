import type { ComponentType } from 'react'
import { getIntegrationLogoPath } from '@/lib/integrations/integration-logo'
import { cn } from '@/lib/utils/cn'
import type { TemplateNavFilterId } from '@/lib/flows/automation-template-nav'
import type {
  AutomationTemplateIntegration,
  AutomationTemplatePreset,
} from '@/lib/flows/automation-templates'

const INTEGRATION_LABELS: Record<AutomationTemplateIntegration, string> = {
  fathom: 'Fathom',
  email: 'Email',
  slack: 'Slack',
  google_calendar: 'Google Calendar',
  google_drive: 'Google Drive',
  google_sheets: 'Google Sheets',
  salesforce: 'Salesforce',
  github: 'GitHub',
  notion: 'Notion',
}

export function getAutomationTemplateIntegrationLogoPath(
  integration: AutomationTemplateIntegration,
): string | null {
  switch (integration) {
    case 'fathom':
      return getIntegrationLogoPath('fathom')
    case 'slack':
      return getIntegrationLogoPath('slack')
    case 'email':
      return getIntegrationLogoPath('gmail')
    case 'google_calendar':
      return getIntegrationLogoPath('google_calendar')
    case 'google_drive':
      return getIntegrationLogoPath('google_drive')
    case 'google_sheets':
      return getIntegrationLogoPath('google_sheets')
    case 'salesforce':
      return getIntegrationLogoPath('salesforce')
    case 'github':
      return getIntegrationLogoPath('github')
    case 'notion':
      return getIntegrationLogoPath('notion')
  }
}

export function getTemplateNavFilterLogoPath(filterId: TemplateNavFilterId): string | null {
  if (
    filterId === 'fathom' ||
    filterId === 'email' ||
    filterId === 'slack' ||
    filterId === 'google_calendar' ||
    filterId === 'google_drive' ||
    filterId === 'google_sheets' ||
    filterId === 'salesforce' ||
    filterId === 'github' ||
    filterId === 'notion'
  ) {
    return getAutomationTemplateIntegrationLogoPath(filterId)
  }
  return null
}

export function AutomationIntegrationLogo({
  src,
  name,
  className,
}: {
  src: string
  name: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-[1px]',
        className ?? 'h-spacing-4 w-spacing-4',
      )}
    >
      <img
        src={src}
        alt={`${name} logo`}
        className="block h-full w-full object-contain object-center"
      />
    </span>
  )
}

export function AutomationTemplateVisual({
  template,
  iconClassName = 'icon-sm text-muted-foreground shrink-0',
  FallbackIcon,
}: {
  template: AutomationTemplatePreset
  iconClassName?: string
  FallbackIcon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
}) {
  if (template.integration) {
    const src = getAutomationTemplateIntegrationLogoPath(template.integration)
    if (src) {
      return <AutomationIntegrationLogo src={src} name={INTEGRATION_LABELS[template.integration]} />
    }
  }
  return <FallbackIcon className={iconClassName} aria-hidden />
}
