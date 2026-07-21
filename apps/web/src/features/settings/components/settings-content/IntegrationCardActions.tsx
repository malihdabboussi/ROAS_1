'use client'

import { Info, Loader2, Trash2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'

type Props = {
  variant: 'card' | 'list'
  isConnected: boolean
  comingSoon: boolean
  connecting: boolean
  disconnecting: boolean
  primaryActionLabel: string
  listProgressLabel: string
  cardProgressLabel: string
  isActive: boolean
  ghlLearnTour?: string
  ghlConnectTour?: string
  onLearnMore: () => void
  onConnect: () => void
  onRequestDisconnect?: () => void
}

export function IntegrationCardActions({
  variant,
  isConnected,
  comingSoon,
  connecting,
  disconnecting,
  primaryActionLabel,
  listProgressLabel,
  cardProgressLabel,
  isActive,
  ghlLearnTour,
  ghlConnectTour,
  onLearnMore,
  onConnect,
  onRequestDisconnect,
}: Props) {
  const learnMoreControl =
    variant === 'list' ? (
      <Tooltip label="Learn more">
        <button
          type="button"
          onClick={onLearnMore}
          className="btn-icon-bare shrink-0"
          aria-label="Learn more"
          data-tour={ghlLearnTour}
        >
          <Info className="icon-xs shrink-0" strokeWidth={2} />
        </button>
      </Tooltip>
    ) : (
      <button
        type="button"
        onClick={onLearnMore}
        className="body-3 link-learn-more transition-colors"
        data-tour={ghlLearnTour}
      >
        Learn more
      </button>
    )

  const listConnectButtonClass =
    'body-3 text-foreground border-border rounded-spacing-2 px-spacing-3 py-spacing-1 shrink-0 border font-medium transition-colors hover:bg-hover-subtle disabled:opacity-50'

  const connectDisconnectControl = isConnected ? (
    onRequestDisconnect ? (
      variant === 'list' ? (
        <Tooltip label={disconnecting ? 'Disconnecting…' : 'Disconnect'}>
          <button
            type="button"
            onClick={onRequestDisconnect}
            disabled={disconnecting}
            className="text-destructive flex h-8 w-8 shrink-0 items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-50"
            aria-label={disconnecting ? 'Disconnecting' : 'Disconnect'}
          >
            {disconnecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        </Tooltip>
      ) : (
        <button
          type="button"
          onClick={onRequestDisconnect}
          disabled={disconnecting}
          className="button-glass-destructive rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium disabled:opacity-50"
        >
          {disconnecting ? 'Disconnecting...' : 'Disconnect'}
        </button>
      )
    ) : (
      <span className="badge-glass badge-glass-green flex-shrink-0">Connected</span>
    )
  ) : comingSoon ? (
    variant === 'list' ? (
      <button type="button" disabled className={`${listConnectButtonClass} opacity-50`}>
        {primaryActionLabel}
      </button>
    ) : (
      <button
        type="button"
        disabled
        className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium opacity-50"
      >
        {primaryActionLabel}
      </button>
    )
  ) : variant === 'list' ? (
    <button
      type="button"
      onClick={onConnect}
      disabled={!isActive || connecting}
      className={listConnectButtonClass}
      data-tour={ghlConnectTour}
    >
      {connecting ? listProgressLabel : primaryActionLabel}
    </button>
  ) : (
    <button
      type="button"
      onClick={onConnect}
      disabled={!isActive || connecting}
      className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium disabled:opacity-50"
      data-tour={ghlConnectTour}
    >
      {connecting ? cardProgressLabel : primaryActionLabel}
    </button>
  )

  return (
    <div
      className={
        variant === 'list'
          ? 'gap-spacing-2 flex flex-shrink-0 flex-wrap items-center'
          : 'pt-spacing-2 mt-auto flex items-center justify-between'
      }
    >
      {learnMoreControl}
      {connectDisconnectControl}
    </div>
  )
}
