function isConnectedAgentUsable(row: Record<string, unknown>, isMission: boolean): boolean {
  return (
    String(row.status ?? '').toLowerCase() === 'connected' &&
    (isMission || row.agent_enabled !== false)
  )
}

function isOrgSharedRow(row: Record<string, unknown>): boolean {
  return String(row.scope_mode ?? '') === 'org_shared'
}

function isPersonalRow(row: Record<string, unknown>, userId: string): boolean {
  return String(row.scope_mode ?? '') === 'personal' && String(row.user_id ?? '') === userId
}

function connectionLabel(row: Record<string, unknown>, fallback: string): string {
  const metadata =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {}
  const raw = String(
    row.connection_label ??
      metadata.connection_label ??
      metadata.email ??
      metadata.display_name ??
      '',
  ).trim()
  return raw || fallback
}

type IntegrationRepairAction = {
  type: 'connect' | 'reconnect' | 'open_settings' | 'use_connection'
  provider: string
  label: string
  connectionId?: string
  scopeMode?: string
  message?: string
}

type IntegrationDoctorCheck = {
  label: string
  status: 'pass' | 'warning' | 'fail'
  detail: string
}

function rowStatus(row: Record<string, unknown> | null): string {
  return String(row?.status ?? 'disconnected')
    .trim()
    .toLowerCase()
}

function rowScope(row: Record<string, unknown>): string {
  const scopeMode = String(row.scope_mode ?? '').trim()
  return scopeMode || 'personal'
}

function resolvedStatus(row: Record<string, unknown> | null, isMission: boolean): string {
  if (!row) return 'disconnected'
  const status = rowStatus(row)
  if (status === 'connected' && !isConnectedAgentUsable(row, isMission)) return 'access_denied'
  return status || 'disconnected'
}

function doctorConnection(
  row: Record<string, unknown>,
  input: { providerLabel: string; isMission: boolean; selectedId?: string | null },
) {
  const id = String(row.id ?? '').trim()
  const status = rowStatus(row)
  return {
    id: id || null,
    label: connectionLabel(row, `${rowScope(row)} ${input.providerLabel}`),
    scope: rowScope(row),
    status,
    selected: !!id && id === input.selectedId,
    usable: isConnectedAgentUsable(row, input.isMission),
    isDefault: Boolean(row.is_default),
    agentEnabled: input.isMission || row.agent_enabled !== false,
  }
}

function repairActions(input: { service: string; providerLabel: string; status: string }): {
  primaryAction: IntegrationRepairAction
  secondaryActions: IntegrationRepairAction[]
} {
  const actionType = input.status === 'needs_reconnect' ? 'reconnect' : 'connect'
  const primaryAction: IntegrationRepairAction =
    input.status === 'access_denied'
      ? {
          type: 'open_settings',
          provider: input.service,
          label: 'Open settings',
        }
      : {
          type: actionType,
          provider: input.service,
          label:
            actionType === 'reconnect'
              ? `Reconnect ${input.providerLabel}`
              : `Connect ${input.providerLabel}`,
        }
  const secondaryActions =
    primaryAction.type === 'open_settings'
      ? []
      : [
          {
            type: 'open_settings' as const,
            provider: input.service,
            label: 'Open settings',
          },
        ]
  return { primaryAction, secondaryActions }
}

function buildDoctor(input: {
  rows: Array<Record<string, unknown>>
  selectedRow: Record<string, unknown> | null
  selectedId?: string | null
  providerLabel: string
  status: string
  summary: string
  checks: IntegrationDoctorCheck[]
  isMission: boolean
  nextActions: IntegrationRepairAction[]
}) {
  const connections = input.rows.map((row) =>
    doctorConnection(row, {
      providerLabel: input.providerLabel,
      isMission: input.isMission,
      selectedId: input.selectedId,
    }),
  )
  const selectedConnection = input.selectedRow
    ? doctorConnection(input.selectedRow, {
        providerLabel: input.providerLabel,
        isMission: input.isMission,
        selectedId: input.selectedId,
      })
    : null
  return {
    providerLabel: input.providerLabel,
    status: input.status,
    summary: input.summary,
    selectedConnection,
    connections,
    checks: input.checks,
    nextActions: input.nextActions,
  }
}

function buildRepair(input: {
  service: string
  providerLabel: string
  status: string
  problem: string
  doctor: Record<string, unknown>
}) {
  const actions = repairActions(input)
  return {
    title:
      input.status === 'needs_reconnect'
        ? `Reconnect ${input.providerLabel}`
        : input.status === 'access_denied'
          ? `${input.providerLabel} needs access`
          : `Connect ${input.providerLabel}`,
    description: input.problem,
    status: input.status,
    problem: input.problem,
    primaryAction: actions.primaryAction,
    secondaryActions: actions.secondaryActions,
    doctor: input.doctor,
  }
}

function fallbackApprovalMessage(input: {
  providerLabel: string
  connectionId: string
  connectionLabel: string
}): string {
  return [
    `I approve using my personal ${input.providerLabel} connection "${input.connectionLabel}" for this task.`,
    `Retry the ${input.providerLabel} integration action with integration_connection_id "${input.connectionId}".`,
    'Do not use this personal connection for future tasks unless I approve it again.',
  ].join(' ')
}

export function providerDisplayLabel(id: string): string {
  return id.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export function resolveIntegrationConnectionState(input: {
  rows: Array<Record<string, unknown>>
  userId: string
  orgId?: string | null
  providerLabel: string
  service: string
  isMission: boolean
}): Record<string, unknown> {
  const scopedRows = input.rows.filter((row) => {
    if (!input.orgId) return true
    if (isOrgSharedRow(row)) return true
    if (isPersonalRow(row, input.userId)) return true
    return false
  })
  const connectedUsable = (row: Record<string, unknown>) =>
    isConnectedAgentUsable(row, input.isMission)

  if (!input.orgId) {
    const row = scopedRows.find(connectedUsable) ?? scopedRows[0] ?? null
    const status = row ? resolvedStatus(row, input.isMission) : 'disconnected'
    const connected = !!row && connectedUsable(row)
    const selectedId = row ? String(row.id ?? '') : null
    const summary = connected
      ? `${input.providerLabel} is connected and ready for this agent.`
      : status === 'access_denied'
        ? `${input.providerLabel} is connected, but agent access is disabled.`
        : status === 'needs_reconnect'
          ? `${input.providerLabel} is connected in Vibey but the provider session expired.`
          : `${input.providerLabel} is not connected yet.`
    const actions = repairActions({
      service: input.service,
      providerLabel: input.providerLabel,
      status,
    })
    const doctor = buildDoctor({
      rows: scopedRows,
      selectedRow: row,
      selectedId,
      providerLabel: input.providerLabel,
      status: connected ? 'ready' : status,
      summary,
      isMission: input.isMission,
      nextActions: connected ? [] : [actions.primaryAction, ...actions.secondaryActions],
      checks: [
        {
          label: 'Connection',
          status: connected ? 'pass' : 'fail',
          detail: connected ? 'Ready to use.' : summary,
        },
        {
          label: 'Agent access',
          status: row && (input.isMission || row.agent_enabled !== false) ? 'pass' : 'warning',
          detail: !row
            ? 'Connect first, then agent access can be checked.'
            : input.isMission || row.agent_enabled !== false
              ? 'Allowed for this agent.'
              : 'Open settings to enable this agent.',
        },
      ],
    })
    return {
      connected,
      status,
      selected_connection_id: selectedId,
      selected_scope: row ? String(row.scope_mode ?? 'personal') : null,
      integration_doctor: doctor,
      ...(connected
        ? {}
        : {
            repair: buildRepair({
              service: input.service,
              providerLabel: input.providerLabel,
              status,
              problem: summary,
              doctor,
            }),
          }),
    }
  }

  const orgRows = scopedRows.filter(isOrgSharedRow)
  const personalRows = scopedRows.filter((row) => isPersonalRow(row, input.userId))
  const orgConnected = orgRows.find(connectedUsable)
  if (orgConnected) {
    const selectedId = String(orgConnected.id ?? '')
    const summary = `${input.providerLabel} is connected through this workspace and ready for this agent.`
    const doctor = buildDoctor({
      rows: scopedRows,
      selectedRow: orgConnected,
      selectedId,
      providerLabel: input.providerLabel,
      status: 'ready',
      summary,
      isMission: input.isMission,
      nextActions: [],
      checks: [
        { label: 'Workspace connection', status: 'pass', detail: 'Ready to use.' },
        { label: 'Agent access', status: 'pass', detail: 'Allowed for this agent.' },
      ],
    })
    return {
      connected: true,
      status: 'connected',
      selected_connection_id: selectedId,
      selected_scope: 'org_shared',
      integration_doctor: doctor,
    }
  }

  const personalConnected = personalRows.find(connectedUsable)
  if (personalConnected) {
    const connectionId = String(personalConnected.id ?? '').trim()
    const label = connectionLabel(personalConnected, `personal ${input.providerLabel}`)
    const problem = `${input.providerLabel} is not ready in this workspace. Your personal ${input.providerLabel} is connected, but I need your approval before using it for this task.`
    const primaryAction: IntegrationRepairAction = {
      type: 'use_connection',
      provider: input.service,
      label: `Use personal ${input.providerLabel}`,
      connectionId,
      scopeMode: 'personal',
      message: fallbackApprovalMessage({
        providerLabel: input.providerLabel,
        connectionId,
        connectionLabel: label,
      }),
    }
    const secondaryActions: IntegrationRepairAction[] = [
      {
        type: 'reconnect',
        provider: input.service,
        label: `Reconnect ${input.providerLabel}`,
      },
      {
        type: 'open_settings',
        provider: input.service,
        label: 'Open settings',
      },
    ]
    const doctor = buildDoctor({
      rows: scopedRows,
      selectedRow: personalConnected,
      selectedId: connectionId,
      providerLabel: input.providerLabel,
      status: 'fallback_available',
      summary: problem,
      isMission: input.isMission,
      nextActions: [primaryAction, ...secondaryActions],
      checks: [
        {
          label: 'Workspace connection',
          status: 'fail',
          detail: 'The workspace connection is missing or not ready.',
        },
        {
          label: 'Personal connection',
          status: 'pass',
          detail: `${label} is connected.`,
        },
        {
          label: 'User approval',
          status: 'warning',
          detail: 'Approval is required before using a personal connection here.',
        },
      ],
    })
    return {
      connected: false,
      status: 'fallback_available',
      selected_connection_id: orgRows[0] ? String(orgRows[0].id ?? '') : null,
      selected_scope: orgRows[0] ? 'org_shared' : null,
      connection_resolution: {
        status: 'fallback_requires_approval',
        preferred_scope: 'org_shared',
        fallback_scope: 'personal',
        fallback_connection_id: connectionId,
        fallback_label: label,
      },
      repair: {
        title: `Use personal ${input.providerLabel}?`,
        description: problem,
        status: 'fallback_available',
        problem,
        primaryAction,
        secondaryActions,
        doctor,
      },
      integration_doctor: doctor,
    }
  }

  const row = orgRows[0] ?? scopedRows[0] ?? null
  const status = row ? resolvedStatus(row, input.isMission) : 'disconnected'
  const selectedId = row ? String(row.id ?? '') : null
  const problem =
    status === 'needs_reconnect'
      ? `${input.providerLabel} is connected in Vibey but the provider session expired.`
      : status === 'access_denied'
        ? `${input.providerLabel} is connected, but this agent is not allowed to use it yet.`
        : `${input.providerLabel} is not connected in this workspace.`
  const actions = repairActions({
    service: input.service,
    providerLabel: input.providerLabel,
    status,
  })
  const doctor = buildDoctor({
    rows: scopedRows,
    selectedRow: row,
    selectedId,
    providerLabel: input.providerLabel,
    status,
    summary: problem,
    isMission: input.isMission,
    nextActions: [actions.primaryAction, ...actions.secondaryActions],
    checks: [
      {
        label: 'Workspace connection',
        status: status === 'needs_reconnect' ? 'warning' : 'fail',
        detail: problem,
      },
      {
        label: 'Personal fallback',
        status: 'fail',
        detail: 'No usable personal connection is available for this user.',
      },
    ],
  })
  return {
    connected: false,
    status,
    selected_connection_id: selectedId,
    selected_scope: row ? String(row.scope_mode ?? '') : null,
    repair: buildRepair({
      service: input.service,
      providerLabel: input.providerLabel,
      status,
      problem,
      doctor,
    }),
    integration_doctor: doctor,
  }
}
