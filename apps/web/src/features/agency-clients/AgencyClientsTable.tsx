import Image from 'next/image'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { FolderOpen, Hash, ListTodo, MoreHorizontal } from 'lucide-react'
import type { AgencyClient } from '@/lib/agency-clients'
import { formatAgencyDate } from './agency-client-format'

type ClientGroup = readonly [string, AgencyClient[]]

export function AgencyClientsTable({ groups }: { groups: ClientGroup[] }) {
  return (
    <div className="gap-spacing-4 flex flex-col">
      {groups.map(([label, clients]) => (
        <section
          key={label}
          className="surface-card rounded-spacing-3 border-border overflow-hidden border"
        >
          <header className="bg-secondary border-border px-spacing-4 py-spacing-3 flex items-center border-b">
            <h2 className="body-2 text-foreground truncate font-semibold uppercase">{label}</h2>
            <span className="body-4 text-muted-foreground ml-auto">
              {clients.length} {clients.length === 1 ? 'client' : 'clients'}
            </span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="body-4 text-muted-foreground border-border border-b text-left">
                  <th className="px-spacing-4 py-spacing-2 font-medium">Pipe</th>
                  <th className="px-spacing-4 py-spacing-2 font-medium">Client</th>
                  <th className="px-spacing-4 py-spacing-2 font-medium">Account Manager</th>
                  <th className="px-spacing-4 py-spacing-2 font-medium">Monday Updates</th>
                  <th className="px-spacing-4 py-spacing-2 font-medium">Friday Updates</th>
                  <th className="px-spacing-4 py-spacing-2 font-medium">Slack Latest Update</th>
                  <th className="px-spacing-4 py-spacing-2 text-right font-medium">Options</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <AgencyClientRow key={client.id} client={client} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}

function AgencyClientRow({ client }: { client: AgencyClient }) {
  const [logoFailed, setLogoFailed] = useState(false)
  const update = client.weekly_update
  return (
    <tr className="hover:bg-hover-subtle border-border border-b last:border-b-0">
      <td className="px-spacing-4 py-spacing-3 align-top">
        <span className="body-4 bg-secondary text-muted-foreground rounded-spacing-4 px-spacing-2 py-spacing-1 inline-flex whitespace-nowrap capitalize">
          {readableStatus(client.pipeline_stage || client.status)}
        </span>
      </td>
      <td className="px-spacing-4 py-spacing-3 align-top">
        <Link href={`/clients/${client.id}`} className="gap-spacing-3 flex items-center">
          <span className="bg-secondary h-spacing-9 w-spacing-9 rounded-spacing-2 flex shrink-0 items-center justify-center overflow-hidden">
            {client.logo_url && !logoFailed ? (
              <Image
                src={client.logo_url}
                alt=""
                width={36}
                height={36}
                unoptimized
                onError={() => setLogoFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="body-3 text-foreground font-semibold">
                {(client.display_name || client.name).slice(0, 1).toUpperCase()}
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="body-3 text-foreground block truncate font-medium">
              {client.display_name || client.name}
            </span>
            <span className="body-4 text-muted-foreground block whitespace-nowrap">
              {client.counts?.campaigns ?? 0} campaigns · {client.counts?.open_tasks ?? 0} open
              tasks
            </span>
          </span>
        </Link>
      </td>
      <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top">
        {client.account_manager?.name || 'Unassigned'}
      </td>
      <td className="px-spacing-4 py-spacing-3 align-top">
        <UpdateCell
          primary={text(update?.current_work) || 'Add update'}
          secondary={text(update?.current_progress)}
          tone={text(update?.status_color)}
        />
      </td>
      <td className="px-spacing-4 py-spacing-3 align-top">
        <UpdateCell
          primary={text(update?.eow_what_we_did) || 'Add wrap-up'}
          secondary={text(update?.eow_carry_over)}
          tone={text(update?.eow_status_color)}
        />
      </td>
      <td className="px-spacing-4 py-spacing-3 align-top">
        <p className="body-3 text-foreground line-clamp-2">
          {text(client.latest_slack_message) || 'No recent updates'}
        </p>
        {client.latest_slack_message_at ? (
          <p className="body-4 text-muted-foreground mt-spacing-1">
            {formatAgencyDate(client.latest_slack_message_at)}
          </p>
        ) : null}
      </td>
      <td className="px-spacing-4 py-spacing-3 align-top">
        <div className="gap-spacing-1 flex justify-end">
          <ExternalOption href={client.drive_link} label="Open Google Drive">
            <FolderOpen className="icon-sm" />
          </ExternalOption>
          <ExternalOption href={client.clickup_url} label="Open ClickUp project tracker">
            <ListTodo className="icon-sm" />
          </ExternalOption>
          <ExternalOption href={client.slack_channel_url} label="Open Slack channel">
            <Hash className="icon-sm" />
          </ExternalOption>
          <Link
            href={`/clients/${client.id}`}
            aria-label={`Open ${client.display_name || client.name}`}
            className="btn-icon-bare hover:bg-hover-subtle"
          >
            <MoreHorizontal className="icon-sm" />
          </Link>
        </div>
      </td>
    </tr>
  )
}

function UpdateCell({
  primary,
  secondary,
  tone,
}: {
  primary: string
  secondary: string
  tone: string
}) {
  return (
    <div className="gap-spacing-2 flex items-start">
      <span className={updateDotClass(tone)} aria-hidden />
      <span className="min-w-0">
        <span className="body-3 text-foreground line-clamp-2 block">{primary}</span>
        {secondary ? (
          <span className="body-4 text-muted-foreground mt-spacing-1 line-clamp-1 block">
            {secondary}
          </span>
        ) : null}
      </span>
    </div>
  )
}

function ExternalOption({
  href,
  label,
  children,
}: {
  href: unknown
  label: string
  children: ReactNode
}) {
  if (typeof href !== 'string' || !href) {
    return (
      <span
        aria-label={`${label} unavailable`}
        title={`${label} unavailable`}
        className="btn-icon-bare text-muted-foreground opacity-40"
      >
        {children}
      </span>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="btn-icon-bare hover:bg-hover-subtle text-muted-foreground hover:text-foreground"
    >
      {children}
    </a>
  )
}

function updateDotClass(tone: string) {
  const base = 'mt-spacing-1 h-2 w-2 rounded-spacing-4 shrink-0'
  if (tone === 'green') return `${base} bg-success`
  if (tone === 'red') return `${base} bg-destructive`
  if (tone === 'yellow') return `${base} bg-warning`
  return `${base} bg-muted-foreground`
}

function readableStatus(value: string) {
  return value.replace(/_/g, ' ').toLowerCase()
}

function text(value: unknown) {
  return typeof value === 'string' ? value : ''
}
