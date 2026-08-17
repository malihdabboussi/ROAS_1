'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { FolderOpen, Hash, ListTodo, MoreHorizontal } from 'lucide-react'
import type { AgencyClient } from '@/lib/agency-clients'
import { formatAgencyDate } from './agency-client-format'
import { AGENCY_CLIENT_MESSAGES } from './config/messages.config'

type ClientGroup = readonly [string, AgencyClient[]]

const TABLE_CLASS = 'w-full min-w-0 table-fixed border-collapse'
const CELL = 'min-w-0 overflow-hidden px-spacing-4 py-spacing-3 align-middle'
const AVATAR_BOX =
  'bg-secondary h-spacing-9 w-spacing-9 rounded-spacing-2 flex shrink-0 items-center justify-center overflow-hidden'
const AVATAR_IMG = 'block h-spacing-9 w-spacing-9 object-cover'

function ClientColgroup() {
  return (
    <colgroup>
      <col className="w-spacing-36" />
      <col className="w-spacing-64" />
      <col className="w-spacing-36" />
      <col />
      <col />
      <col />
      <col className="w-spacing-48" />
    </colgroup>
  )
}

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
            <table className={TABLE_CLASS}>
              <ClientColgroup />
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
  const update = client.weekly_update
  const monday = text(update?.current_work)
  const friday = text(update?.eow_what_we_did)
  const slack = text(client.latest_slack_message)
  const slackAt = client.latest_slack_message_at
    ? formatAgencyDate(client.latest_slack_message_at)
    : ''
  return (
    <tr className="hover:bg-hover-subtle border-border border-b last:border-b-0">
      <td className={CELL}>
        <span className="body-4 bg-secondary text-muted-foreground rounded-spacing-4 px-spacing-2 py-spacing-1 block max-w-full truncate capitalize">
          {readableStatus(client.pipeline_stage || client.status)}
        </span>
      </td>
      <td className={CELL}>
        <Link href={`/clients/${client.id}`} className="gap-spacing-3 flex min-w-0 items-center">
          <ClientAvatar client={client} />
          <span className="min-w-0 flex-1">
            <span className="body-3 text-foreground block truncate font-medium">
              {client.display_name || client.name}
            </span>
            <span className="body-4 text-muted-foreground block truncate">
              {client.counts?.campaigns ?? 0} campaigns · {client.counts?.open_tasks ?? 0} open
              tasks
            </span>
          </span>
        </Link>
      </td>
      <td className={`body-3 text-muted-foreground ${CELL}`}>
        <span className="block truncate">
          {client.account_manager?.name || AGENCY_CLIENT_MESSAGES.UNASSIGNED}
        </span>
      </td>
      <td className={CELL}>
        <UpdateCell
          primary={monday || AGENCY_CLIENT_MESSAGES.ADD_UPDATE}
          tone={text(update?.status_color)}
          placeholder={!monday}
        />
      </td>
      <td className={CELL}>
        <UpdateCell
          primary={friday || AGENCY_CLIENT_MESSAGES.ADD_WRAP_UP}
          tone={text(update?.eow_status_color)}
          placeholder={!friday}
        />
      </td>
      <td className={CELL}>
        <p
          className="body-3 text-foreground truncate"
          title={
            slackAt ? `${slack || AGENCY_CLIENT_MESSAGES.NO_RECENT_UPDATES} · ${slackAt}` : slack
          }
        >
          {slack || AGENCY_CLIENT_MESSAGES.NO_RECENT_UPDATES}
        </p>
      </td>
      <td className="px-spacing-4 py-spacing-3 align-middle">
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

function ClientAvatar({ client }: { client: AgencyClient }) {
  const [logoFailed, setLogoFailed] = useState(false)
  const name = client.display_name || client.name
  return (
    <span className={AVATAR_BOX}>
      {client.logo_url && !logoFailed ? (
        <Image
          src={client.logo_url}
          alt=""
          width={36}
          height={36}
          unoptimized
          onError={() => setLogoFailed(true)}
          className={AVATAR_IMG}
        />
      ) : (
        <span className="body-3 text-foreground font-semibold">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  )
}

function UpdateCell({
  primary,
  tone,
  placeholder,
}: {
  primary: string
  tone: string
  placeholder: boolean
}) {
  return (
    <div className="gap-spacing-2 flex min-w-0 items-center">
      <span className={updateDotClass(tone)} aria-hidden />
      <span
        className={`body-3 min-w-0 truncate ${placeholder ? 'text-muted-foreground' : 'text-foreground'}`}
      >
        {primary}
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
  const base = 'icon-2xs rounded-spacing-4 shrink-0'
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
