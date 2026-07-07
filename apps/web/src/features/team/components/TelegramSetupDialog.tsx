'use client'

import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Switch } from '@/components/ui/forms/switch'
import { fetchCampaigns } from '@/features/studio/services/campaign.service'
import type { Campaign } from '@/features/studio/types'
import {
  checkTelegramVerification,
  connectTelegram,
  setTelegramVisibility,
  updateTelegramSettings,
  validateTelegramToken,
  type TelegramBotValidation,
} from '../services/channels.service'
import { CampaignDestinationField } from './shared/CampaignDestinationField'

interface TelegramSetupDialogProps {
  agentKey: string
  agentName: string
  onClose: () => void
  onConnected: (botUsername: string) => void
}

type Step = 'instructions' | 'token' | 'confirm' | 'verify' | 'done'

export function TelegramSetupDialog({
  agentKey,
  agentName,
  onClose,
  onConnected,
}: TelegramSetupDialogProps) {
  const [step, setStep] = useState<Step>('instructions')
  const [token, setToken] = useState('')
  const [botInfo, setBotInfo] = useState<TelegramBotValidation | null>(null)
  const [validating, setValidating] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [defaultCampaignId, setDefaultCampaignId] = useState<string | null>(null)

  useEffect(() => {
    if (step !== 'done') return
    let cancelled = false
    fetchCampaigns()
      .then((items) => {
        if (!cancelled) setCampaigns(items)
      })
      .catch(() => {
        if (!cancelled) setCampaigns([])
      })
    return () => {
      cancelled = true
    }
  }, [step])

  const handleDefaultCampaignChange = useCallback(
    (campaignId: string | null) => {
      setDefaultCampaignId(campaignId)
      void updateTelegramSettings(agentKey, { default_campaign_id: campaignId }).catch(() => {})
    },
    [agentKey],
  )

  const handleValidate = useCallback(async () => {
    if (!token.trim()) return
    setValidating(true)
    setError(null)
    try {
      const info = await validateTelegramToken(token.trim())
      setBotInfo(info)
      setStep('confirm')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid token')
    } finally {
      setValidating(false)
    }
  }, [token])

  const handleConnect = useCallback(async () => {
    if (!botInfo) return
    setConnecting(true)
    setError(null)
    try {
      await connectTelegram(agentKey, token.trim())
      setStep('verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    } finally {
      setConnecting(false)
    }
  }, [agentKey, token, botInfo])

  const handleVerify = useCallback(async () => {
    setVerifying(true)
    setError(null)
    try {
      const status = await checkTelegramVerification(agentKey)
      if (status.verified) {
        onConnected(botInfo?.bot_username ?? '')
        setStep('done')
      } else {
        setError('No message received yet. Make sure you pressed Start on the bot.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification check failed')
    } finally {
      setVerifying(false)
    }
  }, [agentKey, botInfo, onConnected])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-modal-overlay px-4">
      <div className="surface-card border-subtle rounded-spacing-3 p-spacing-5 relative w-full max-w-md border">
        <button
          type="button"
          onClick={onClose}
          className="btn-icon-bare btn-close-absolute"
          aria-label="Close"
        >
          <X className="icon-sm" />
        </button>
        <div className="mb-spacing-4">
          <h3 className="text-foreground text-base font-semibold uppercase">CONNECT TELEGRAM</h3>
        </div>

        {step === 'instructions' && (
          <div className="space-y-spacing-3">
            <p className="body-3 text-muted-foreground">
              Connect a Telegram bot to{' '}
              <span className="text-foreground font-medium">{agentName}</span> so they can chat with
              people on Telegram.
            </p>
            <div className="rounded-spacing-2 p-spacing-3 space-y-spacing-2 border border-border bg-surface-subtle">
              <p className="body-4 text-muted-foreground/70 uppercase tracking-wide">Setup Steps</p>
              <ol className="body-3 text-muted-foreground space-y-spacing-1 list-inside list-decimal">
                <li>
                  Open Telegram and search for{' '}
                  <span className="text-foreground font-medium">@BotFather</span>
                </li>
                <li>
                  Send <span className="text-foreground font-mono">/newbot</span> and follow the
                  prompts
                </li>
                <li>Copy the bot token BotFather gives you</li>
                <li>Paste it in the next step</li>
              </ol>
            </div>
            <button
              type="button"
              onClick={() => setStep('token')}
              className="button-glass-primary rounded-spacing-2 py-spacing-2 body-3 w-full text-center"
            >
              I have my token
            </button>
          </div>
        )}

        {step === 'token' && (
          <div className="space-y-spacing-3">
            <div>
              <p className="body-4 text-muted-foreground/70 mb-spacing-1">Bot Token</p>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                className="input-glass body-4 px-spacing-3 py-spacing-2 w-full"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleValidate()
                }}
              />
            </div>
            {error && <p className="body-4 text-red-400">{error}</p>}
            <div className="gap-spacing-2 flex">
              <button
                type="button"
                onClick={() => {
                  setStep('instructions')
                  setError(null)
                }}
                className="button-glass-neutral rounded-spacing-2 py-spacing-2 body-3 flex-1 text-center"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleValidate()}
                disabled={validating || !token.trim()}
                className="button-glass-primary rounded-spacing-2 py-spacing-2 body-3 flex-1 text-center"
              >
                {validating ? 'Validating...' : 'Validate'}
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && botInfo && (
          <div className="space-y-spacing-3">
            <div className="rounded-spacing-2 p-spacing-3 border border-emerald-500/30 bg-emerald-500/10">
              <p className="body-3 font-medium text-emerald-400">Bot verified</p>
              <p className="body-4 text-muted-foreground mt-spacing-1">
                @{botInfo.bot_username} ({botInfo.bot_first_name})
              </p>
            </div>
            <p className="body-3 text-muted-foreground">
              Connect this bot to <span className="text-foreground font-medium">{agentName}</span>?
              Messages sent to the bot will be handled by this agent.
            </p>
            {error && <p className="body-4 text-red-400">{error}</p>}
            <div className="gap-spacing-2 flex">
              <button
                type="button"
                onClick={() => {
                  setStep('token')
                  setError(null)
                }}
                className="button-glass-neutral rounded-spacing-2 py-spacing-2 body-3 flex-1 text-center"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleConnect()}
                disabled={connecting}
                className="button-glass-primary rounded-spacing-2 py-spacing-2 body-3 flex-1 text-center"
              >
                {connecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        )}

        {step === 'verify' && botInfo && (
          <div className="space-y-spacing-3">
            <div className="rounded-spacing-2 p-spacing-3 border border-amber-500/30 bg-amber-500/10">
              <p className="body-3 font-medium text-amber-400">One more step</p>
              <p className="body-4 text-muted-foreground mt-spacing-1">
                Open{' '}
                <a
                  href={`https://t.me/${botInfo.bot_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline"
                >
                  @{botInfo.bot_username}
                </a>{' '}
                on Telegram and press <span className="text-foreground font-medium">Start</span>.
              </p>
            </div>
            <p className="body-4 text-muted-foreground">
              This verifies you as the bot owner. Once you&apos;ve pressed Start, click Verify
              below.
            </p>
            {error && <p className="body-4 text-red-400">{error}</p>}
            <button
              type="button"
              onClick={() => void handleVerify()}
              disabled={verifying}
              className="button-glass-primary rounded-spacing-2 py-spacing-2 body-3 w-full text-center"
            >
              {verifying ? 'Checking...' : 'Verify'}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-spacing-3">
            <div className="rounded-spacing-2 p-spacing-3 border border-emerald-500/30 bg-emerald-500/10">
              <p className="body-3 font-medium text-emerald-400">Telegram connected</p>
              <p className="body-4 text-muted-foreground mt-spacing-1">
                @{botInfo?.bot_username} is now linked to {agentName}
              </p>
            </div>
            <div className="rounded-spacing-2 p-spacing-3 flex items-center justify-between border border-border bg-surface-subtle">
              <div>
                <span className="body-3 text-foreground">Public Bot</span>
                <p className="body-4 text-muted-foreground/60">
                  When off, only you can chat with this bot. When on, anyone on Telegram can message
                  it.
                </p>
              </div>
              <Switch
                checked={false}
                onCheckedChange={async (val) => {
                  await setTelegramVisibility(agentKey, val).catch(() => {})
                }}
              />
            </div>
            <CampaignDestinationField
              value={defaultCampaignId}
              campaigns={campaigns}
              onChange={handleDefaultCampaignChange}
              description="People who message this bot will appear in that campaign's Contacts view."
            />
            <button
              type="button"
              onClick={onClose}
              className="button-glass-primary rounded-spacing-2 py-spacing-2 body-3 w-full text-center"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
