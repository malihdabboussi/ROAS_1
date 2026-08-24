import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import {
  createAgencyLaunch,
  fetchAgencyClientCampaigns,
  fetchAgencyClients,
  type AgencyClient,
  type AgencyClientCampaign,
} from '@/lib/agency-clients'
import { dateKey } from './launches-utils'

const INPUT_CLASS =
  'body-3 bg-secondary text-foreground rounded-spacing-2 border-border px-spacing-3 py-spacing-2 focus:ring-primary w-full border outline-none focus:ring-1 disabled:opacity-50'

export function AddLaunchDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => Promise<void>
}) {
  const [clients, setClients] = useState<AgencyClient[]>([])
  const [campaigns, setCampaigns] = useState<AgencyClientCampaign[]>([])
  const [clientId, setClientId] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [name, setName] = useState('')
  const [launchDate, setLaunchDate] = useState(dateKey(new Date()))
  const [launchTime, setLaunchTime] = useState('12:00')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void Promise.all([fetchAgencyClients('', false), fetchAgencyClientCampaigns(undefined, false)])
      .then(([clientResponse, campaignResponse]) => {
        setClients(clientResponse.clients)
        setCampaigns(campaignResponse.campaigns)
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'Could not load launch options.'),
      )
  }, [])

  const availableCampaigns = campaigns.filter((campaign) => campaign.client_id === clientId)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createAgencyLaunch({
        client_id: clientId,
        campaign_id: campaignId,
        launch_name: name,
        launch_date: launchDate,
        launch_time: launchTime || undefined,
        event_date: eventDate || undefined,
        event_time: eventTime || undefined,
      })
      await onCreated()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not add the launch.')
      setSaving(false)
    }
  }

  return (
    <div
      className="z-modal-backdrop bg-modal-overlay p-spacing-4 fixed inset-0 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-launch-title"
    >
      <form
        onSubmit={submit}
        className="surface-card rounded-spacing-3 border-border p-spacing-5 gap-spacing-4 flex w-full max-w-lg flex-col border shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="add-launch-title" className="heading-3 text-foreground">
            Add launch to calendar
          </h2>
          <button type="button" onClick={onClose} className="btn-icon-bare" aria-label="Close">
            <X className="icon-sm" />
          </button>
        </div>
        <Field label="Client">
          <select
            required
            value={clientId}
            onChange={(event) => {
              setClientId(event.target.value)
              setCampaignId('')
            }}
            className={INPUT_CLASS}
          >
            <option value="">Select client…</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.display_name || client.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Campaign">
          <select
            required
            value={campaignId}
            disabled={!clientId}
            onChange={(event) => setCampaignId(event.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">{clientId ? 'Select campaign…' : 'Select a client first'}</option>
            {availableCampaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Launch name">
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. August webinar launch"
            className={INPUT_CLASS}
          />
        </Field>
        <div className="gap-spacing-3 grid grid-cols-2">
          <Field label="Launch date">
            <input
              required
              type="date"
              value={launchDate}
              onChange={(event) => setLaunchDate(event.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Time">
            <input
              type="time"
              value={launchTime}
              onChange={(event) => setLaunchTime(event.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
        </div>
        <div className="gap-spacing-3 grid grid-cols-2">
          <Field label="Event date (optional)">
            <input
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Event time">
            <input
              type="time"
              value={eventTime}
              onChange={(event) => setEventTime(event.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
        </div>
        {error ? <p className="body-3 text-destructive">{error}</p> : null}
        <button
          type="submit"
          disabled={saving || !clientId || !campaignId || !name.trim()}
          className="button-primary justify-center disabled:opacity-50"
        >
          {saving ? 'Adding launch…' : 'Add launch'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="gap-spacing-1 body-4 text-foreground flex flex-col font-medium">
      {label}
      {children}
    </label>
  )
}
