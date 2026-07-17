import { describe, expect, it, vi } from 'vitest'
import { MissionExecutePhaseService } from '../phases/mission-execute-phase.service'
import { MissionReviewPhaseService } from '../phases/mission-review-phase.service'

function createService() {
  const databaseService = {
    getClient: vi.fn(),
  } as any
  const stateRepo = {
    resolveManagerKey: vi.fn().mockResolvedValue('mgr'),
    getMission: vi.fn(),
    updateAgentStatus: vi.fn().mockResolvedValue(undefined),
    insertLog: vi.fn().mockResolvedValue(undefined),
    getPlan: vi.fn().mockResolvedValue(null),
    getRecentUserComments: vi.fn().mockResolvedValue([]),
    updateMissionState: vi.fn().mockResolvedValue(undefined),
    enqueueReadySubtaskEvents: vi.fn().mockResolvedValue(undefined),
    enqueueMissionOutboxEvent: vi.fn().mockResolvedValue(undefined),
  } as any
  const openclawGateway = {
    callOpenClawForSubtaskReview: vi.fn(),
    callOpenClawForReview: vi.fn(),
  } as any
  const agentSignalService = { emitSignal: vi.fn().mockResolvedValue(undefined) } as any
  const agentStateService = {
    patchAgentState: vi.fn().mockResolvedValue(undefined),
  } as any
  const jsonService = {
    validateSubtaskReviewPayload: vi.fn(),
  } as any
  const support = {
    getTimeoutMs: vi.fn().mockReturnValue(300000),
    withTimeout: vi.fn(async (promise: Promise<Record<string, unknown>>) => promise),
    handlePhaseError: vi.fn().mockResolvedValue(undefined),
  } as any
  const notificationEmitter = { emitBlocked: vi.fn().mockResolvedValue(undefined) } as any
  const configService = { get: vi.fn().mockReturnValue(undefined) } as any
  return new MissionReviewPhaseService(
    databaseService,
    stateRepo,
    openclawGateway,
    agentSignalService,
    agentStateService,
    jsonService,
    support,
    notificationEmitter,
    configService,
  ) as any
}

function createSubtasksQueryResult(subtasks: Array<Record<string, unknown>>) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: subtasks, error: null }),
  }
  return chain
}

function createExecuteService() {
  const databaseService = { getClient: vi.fn() } as any
  const stateRepo = {
    getMission: vi.fn(),
    getPlan: vi.fn(),
    getRecentUserComments: vi.fn(),
    getSubtaskDependencyOutputs: vi.fn(),
    updateMissionState: vi.fn(),
    updateAgentStatus: vi.fn(),
    insertLog: vi.fn(),
    enqueueMissionOutboxEvent: vi.fn(),
    enqueueReadySubtaskEvents: vi.fn(),
    missionHasSubtasks: vi.fn(),
    recomputeMissionStatus: vi.fn(),
  } as any
  const deliverablesRepo = {
    hasToolAuthoredDeliverables: vi.fn(),
    getLatestToolAuthoredDeliverableId: vi.fn(),
  } as any
  const openclawGateway = {
    callOpenClawRaw: vi.fn(),
    callOpenClawForExecution: vi.fn(),
    callOpenClawForStep: vi.fn(),
    assertMissionHasCredits: vi.fn().mockResolvedValue(undefined),
  } as any
  const contextService = {
    buildCampaignContext: vi.fn(),
    extractTopRelevantCampaignFacts: vi.fn(),
  } as any
  const jsonService = {
    tryParseJson: vi.fn((content: string) => ({ raw: content })),
  } as any
  const support = {
    getTimeoutMs: vi.fn().mockReturnValue(300000),
    getExecutionAbsoluteMaxMs: vi.fn().mockReturnValue(600000),
    withTimeout: vi.fn(async (promise: Promise<Record<string, unknown>>) => promise),
    handlePhaseError: vi.fn().mockResolvedValue(undefined),
  } as any
  const abortRegistry = {
    register: vi.fn(),
    unregister: vi.fn(),
    abort: vi.fn(),
  } as any
  const broadcast = {
    init: vi.fn().mockResolvedValue(undefined),
    emitToolStart: vi.fn(),
    emitToolUpdate: vi.fn(),
    emitToolDone: vi.fn(),
    emitThinkingDelta: vi.fn(),
    emitAssistantDelta: vi.fn(),
    emitExecComplete: vi.fn().mockResolvedValue(undefined),
    emitExecFailed: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn().mockResolvedValue(undefined),
  } as any
  return new MissionExecutePhaseService(
    databaseService,
    stateRepo,
    deliverablesRepo,
    openclawGateway,
    contextService,
    jsonService,
    support,
    abortRegistry,
    broadcast,
  ) as any
}

describe('MissionsService subtask lifecycle guards', () => {
  it('injects completed action resume context into subtask prompt', async () => {
    const service = createExecuteService()
    service.contextService.buildCampaignContext.mockResolvedValue('Campaign context block')
    service.contextService.extractTopRelevantCampaignFacts.mockReturnValue(['Fact A'])

    const prompt = await service['buildSubtaskExecutionPrompt'](
      {} as any,
      {
        title: 'Mission title',
        brief: 'Mission brief',
      },
      { content: { summary: 'Plan summary' } },
      {
        title: 'Write report and export PDF',
        status: 'in_progress',
        intent: {},
      },
      [],
      [
        '- action=save_document deliverable_id=d1 title="Report doc"',
        '- action=create_pdf deliverable_id=d2 title="Report pdf"',
      ].join('\n'),
      [],
    )

    expect(prompt.taskUserMessage).toContain('ALREADY_COMPLETED_ACTIONS')
    expect(prompt.taskUserMessage).toContain('Do not recreate artifacts')
    expect(prompt.taskUserMessage).toContain('action=save_document')
    expect(prompt.taskUserMessage).toContain('action=create_pdf')
  })

  it('forbids file-export companions when the output contract requires a native Doc', async () => {
    const service = createExecuteService()
    service.contextService.buildCampaignContext.mockResolvedValue('Campaign context block')
    service.contextService.extractTopRelevantCampaignFacts.mockReturnValue(['Fact A'])

    const prompt = await service['buildSubtaskExecutionPrompt'](
      {} as any,
      {
        title: 'Webinar fulfillment',
        brief: 'Create the Copy Package as a Doc',
      },
      { content: { summary: 'Build the webinar package' } },
      {
        title: 'Copy Package',
        status: 'in_progress',
        intent: {},
        output_contract: {
          artifact_kind: 'document_artifact',
          required_action: 'save_document',
          required_artifact_type: 'doc',
          expected: { title: 'Copy Package' },
        },
      },
      [],
      '',
      [],
    )

    expect(prompt.taskUserMessage).toContain('Call save_document for the final output')
    expect(prompt.taskUserMessage).toContain('Publish only the native editable Doc')
    expect(prompt.taskUserMessage).toContain('Do not create PDF, DOCX')
  })

  it('skips stale subtask execute jobs when subtask is already done', async () => {
    const subtaskSelectChain = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 's1',
          title: 'Write blog post',
          status: 'done',
          assigned_agent_key: 'ivy',
          depends_on: [],
        },
        error: null,
      }),
    }
    const allDoneStatusChain = {
      eq: vi.fn().mockResolvedValue({ data: [{ status: 'done' }], error: null }),
    }
    const subtaskFromChain = {
      select: vi.fn().mockImplementation((cols: string) => {
        if (cols === 'status') return allDoneStatusChain
        return subtaskSelectChain
      }),
    }
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'mission_subtasks') return subtaskFromChain
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    const service = createExecuteService()
    service.databaseService.getClient.mockReturnValue(supabase)
    service.stateRepo.getMission.mockResolvedValue({
      id: 'm-stale',
      user_id: 'u1',
      status: 'review',
      title: 'Mission',
      assigned_agent_key: 'ivy',
    })

    const result = await service['processSubtaskExecution']({
      data: {
        missionId: 'm-stale',
        subtaskId: 's1',
        correlationId: 'c-stale',
        userId: 'u1',
        phase: 'execute',
      },
    } as any)

    expect(result.success).toBe(true)
    expect(result.status).toBe('review')
    expect(result.output).toEqual(
      expect.objectContaining({
        skipped_subtask_execute: true,
        reason: 'subtask_already_done',
      }),
    )
    expect(subtaskSelectChain.eq).toHaveBeenCalledWith('mission_id', 'm-stale')
  })

  it('activates a ready human subtask instead of leaving it pending', async () => {
    const subtaskSelectChain = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'gate-1',
          title: 'Approve strategy package',
          status: 'pending',
          assignee_type: 'human',
          assigned_user_id: 'u1',
          depends_on: ['strategy-1'],
        },
        error: null,
      }),
    }
    const subtaskAwaitingChain = {
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ id: 'gate-1' }], error: null }),
    }
    const update = vi.fn().mockReturnValue(subtaskAwaitingChain)
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table !== 'mission_subtasks') throw new Error(`Unexpected table ${table}`)
        return {
          select: vi.fn().mockReturnValue(subtaskSelectChain),
          update,
        }
      }),
    }

    const service = createExecuteService()
    service.databaseService.getClient.mockReturnValue(supabase)
    service.stateRepo.getMission.mockResolvedValue({
      id: 'm-human',
      user_id: 'u1',
      org_id: null,
      status: 'in_progress',
      title: 'Mission',
      priority: 'high',
    })

    const result = await service['processSubtaskExecution']({
      data: {
        missionId: 'm-human',
        subtaskId: 'gate-1',
        correlationId: 'c-human',
        userId: 'u1',
        phase: 'execute',
      },
    } as any)

    expect(result).toMatchObject({
      success: true,
      status: 'awaiting_human',
      output: { reason: 'human_subtask_skipped_by_execute_worker' },
    })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'awaiting_human',
        awaiting_human_since: expect.any(String),
        sla_escalate_at: expect.any(String),
      }),
    )
    expect(service.stateRepo.enqueueMissionOutboxEvent).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        eventType: 'mission.subtask.awaiting_human.requested',
        payload: expect.objectContaining({
          subtask_id: 'gate-1',
          assigned_user_id: 'u1',
        }),
      }),
    )
    expect(service.stateRepo.recomputeMissionStatus).toHaveBeenCalledWith(supabase, 'm-human')
  })

  it('routes kind:blocked output to blocked status with triage', async () => {
    const subtaskSelectChain = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 's-block',
          title: 'Push code to GitHub',
          status: 'pending',
          assigned_agent_key: 'rex',
          depends_on: [],
          execution_state: null,
          intent: {},
          feedback: null,
        },
        error: null,
      }),
    }
    const subtaskClaimChain = {
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ id: 's-block' }], error: null }),
    }
    const subtaskBlockedWriteChain = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ id: 's-block' }], error: null }),
    }
    let updateCallCount = 0
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table !== 'mission_subtasks') throw new Error(`Unexpected table ${table}`)
        return {
          select: vi.fn().mockReturnValue(subtaskSelectChain),
          update: vi.fn().mockImplementation(() => {
            updateCallCount++
            if (updateCallCount === 1) return subtaskClaimChain
            return subtaskBlockedWriteChain
          }),
        }
      }),
    }

    const service = createExecuteService()
    service.databaseService.getClient.mockReturnValue(supabase)
    service.stateRepo.getMission.mockResolvedValue({
      id: 'm-block',
      user_id: 'u1',
      status: 'in_progress',
      title: 'InbarMD Website',
      assigned_agent_key: 'rex',
      correlation_id: 'c-block',
    })
    service.stateRepo.getPlan.mockResolvedValue({ content: { summary: 'Build site' } })
    service.stateRepo.getRecentUserComments.mockResolvedValue([])
    service.stateRepo.getSubtaskDependencyOutputs.mockResolvedValue([])
    service.stateRepo.updateMissionState.mockResolvedValue(undefined)
    service.stateRepo.updateAgentStatus.mockResolvedValue(undefined)
    service.stateRepo.insertLog.mockResolvedValue(undefined)
    service.stateRepo.enqueueMissionOutboxEvent.mockResolvedValue(undefined)
    service.stateRepo.enqueueReadySubtaskEvents.mockResolvedValue(undefined)
    service.stateRepo.recomputeMissionStatus.mockResolvedValue(undefined)
    service.stateRepo.getMission
      .mockResolvedValueOnce({
        id: 'm-block',
        user_id: 'u1',
        status: 'in_progress',
        title: 'InbarMD Website',
        assigned_agent_key: 'rex',
        correlation_id: 'c-block',
      })
      .mockResolvedValue({
        id: 'm-block',
        user_id: 'u1',
        status: 'blocked',
        title: 'InbarMD Website',
      })
    service.contextService.buildCampaignContext.mockResolvedValue('')
    service.contextService.extractTopRelevantCampaignFacts.mockReturnValue([])
    service.support.getExecutionAbsoluteMaxMs = vi.fn().mockReturnValue(600000)
    const execAc = new AbortController()
    service.support.createExecutionDeadline = vi.fn().mockReturnValue({
      signal: execAc.signal,
      controller: execAc,
      touch: vi.fn(),
      dispose: vi.fn(),
      wrap: vi.fn(async (p: Promise<unknown>) => p),
    })

    const blockedJson = JSON.stringify({
      kind: 'blocked',
      feedback: 'Integration github is disabled for agent use',
    })
    service.openclawGateway.callOpenClawRaw.mockResolvedValue({ content: blockedJson })
    service.jsonService.tryParseJson.mockReturnValue({
      kind: 'blocked',
      feedback: 'Integration github is disabled for agent use',
    })

    const result = await service['processSubtaskExecution']({
      data: {
        missionId: 'm-block',
        subtaskId: 's-block',
        correlationId: 'c-block',
        userId: 'u1',
        phase: 'execute',
      },
    } as any)

    expect(result.success).toBe(true)
    expect(result.status).toBe('blocked')
    expect(result.output).toEqual(expect.objectContaining({ kind: 'blocked' }))
    expect(service.stateRepo.enqueueMissionOutboxEvent).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        eventType: 'mission.subtask.triage.requested',
        payload: expect.objectContaining({ requested_by: 'agent_reported_blocked' }),
      }),
    )
    expect(subtaskSelectChain.eq).toHaveBeenCalledWith('mission_id', 'm-block')
    expect(subtaskClaimChain.eq).toHaveBeenCalledWith('mission_id', 'm-block')
    expect(subtaskBlockedWriteChain.eq).toHaveBeenCalledWith('mission_id', 'm-block')
  })

  it('keeps managed role defaults when an agent team has no action-domain grants', async () => {
    const agentQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          agent_key: 'ivy',
          role: 'Senior Conversion Copywriter',
          level: 'employee',
          team_id: 'team-without-action-domains',
          is_active: true,
          config: {
            capability_domain: 'marketing',
            capability_profile: 'managed_domain',
          },
        },
        error: null,
      }),
    }
    const grantsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }
    const overridesQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
        resolve({ data: [], error: null }),
    }
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'agents_registry') return agentQuery
        if (table === 'agent_team_grants') return grantsQuery
        if (table === 'agent_overrides') return overridesQuery
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    const service = createExecuteService()
    const result = await service['preflightContractAction'](
      supabase,
      {
        id: 'm-policy',
        user_id: 'u1',
        org_id: 'org1',
      },
      'ivy',
      'save_document',
    )

    expect(result).toEqual({
      allowed: true,
      reason: 'Action "save_document" is allowed for domain "manage_content".',
      requiredDomain: 'manage_content',
    })
  })

  it('creates mission access approval request instead of blocking missing action-domain access', async () => {
    const accessLookup = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    const accessInsert = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'access-1',
          status: 'pending',
        },
        error: null,
      }),
    }
    const subtaskUpdate: any = {
      eq: vi.fn(() => subtaskUpdate),
      then: (resolve: (value: { data: null; error: null }) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(resolve),
    }
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'mission_agent_access_requests') {
          return {
            select: accessLookup.select,
            insert: vi.fn().mockReturnValue(accessInsert),
            eq: accessLookup.eq,
            in: accessLookup.in,
            order: accessLookup.order,
            limit: accessLookup.limit,
            maybeSingle: accessLookup.maybeSingle,
          }
        }
        if (table === 'mission_subtasks') {
          return {
            update: vi.fn().mockReturnValue(subtaskUpdate),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    const service = createExecuteService()
    const result = await service['handleContractPreflightFailure'](
      supabase,
      {
        id: 'm-access',
        user_id: 'u1',
        org_id: 'org1',
        status: 'in_progress',
      },
      'm-access',
      {
        id: 's-access',
        title: 'Write and save campaign asset',
      },
      's-access',
      'ivy',
      {
        artifact_kind: 'document_artifact',
        required_action: 'save_document',
        required_artifact_type: 'mission_document',
      },
      'Action "save_document" requires action domain "manage_content".',
    )

    expect(result.status).toBe('awaiting_access_approval')
    expect(result.output).toEqual(
      expect.objectContaining({
        access_approval_required: true,
        access_request_id: 'access-1',
        capability_id: 'manage_content',
      }),
    )
    expect(service.stateRepo.updateMissionState).toHaveBeenCalledWith(
      supabase,
      'm-access',
      expect.objectContaining({ status: 'awaiting_access_approval' }),
    )
    expect(service.stateRepo.enqueueMissionOutboxEvent).not.toHaveBeenCalled()
    expect(subtaskUpdate.eq).toHaveBeenCalledWith('mission_id', 'm-access')
  })

  it('skips stale review jobs when mission is no longer in review', async () => {
    const service = createService()
    service.databaseService.getClient.mockReturnValue({})
    service.stateRepo.getMission.mockResolvedValue({
      id: 'm1',
      user_id: 'u1',
      status: 'done',
    })

    const result = await service.process({
      data: { missionId: 'm1', correlationId: 'c1', userId: 'u1', phase: 'review' },
    } as any)

    expect(result.status).toBe('done')
    expect(result.output).toEqual({ skipped_review: true, reason: 'mission_not_in_review' })
  })

  it('defers review when any subtask is incomplete', async () => {
    const subtasks = [
      { id: 's1', title: 'Done subtask', status: 'done' },
      { id: 's2', title: 'Still running', status: 'in_progress' },
    ]
    const subtaskQuery = createSubtasksQueryResult(subtasks)
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'mission_subtasks') return subtaskQuery
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    const service = createService()
    service.databaseService.getClient.mockReturnValue(supabase)
    service.stateRepo.getMission.mockResolvedValue({
      id: 'm2',
      user_id: 'u1',
      status: 'review',
      title: 'Mission',
    })

    const result = await service.process({
      data: { missionId: 'm2', correlationId: 'c2', userId: 'u1', phase: 'review' },
    } as any)

    expect(result.status).toBe('in_progress')
    expect(service.openclawGateway.callOpenClawForSubtaskReview).not.toHaveBeenCalled()
    expect(service.stateRepo.updateMissionState).toHaveBeenCalledWith(
      supabase,
      'm2',
      expect.objectContaining({ status: 'in_progress' }),
    )
  })

  it('rejects malformed/partial subtask review payloads', async () => {
    const subtasks = [
      { id: 's1', title: 'Subtask 1', status: 'done' },
      { id: 's2', title: 'Subtask 2', status: 'done' },
    ]
    const subtaskQuery = createSubtasksQueryResult(subtasks)
    const missionsUpdateChain = {
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'mission_subtasks') return subtaskQuery
        if (table === 'missions') return { update: vi.fn().mockReturnValue(missionsUpdateChain) }
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    const service = createService()
    service.databaseService.getClient.mockReturnValue(supabase)
    service.stateRepo.getMission.mockResolvedValue({
      id: 'm3',
      user_id: 'u1',
      status: 'review',
      title: 'Mission',
      input: {},
    })
    service.openclawGateway.callOpenClawForSubtaskReview = vi
      .fn()
      .mockResolvedValue({ subtaskReviews: [{ subtaskId: 's1', approved: true }] })
    service.jsonService.validateSubtaskReviewPayload.mockReturnValue({
      valid: false,
      reviews: [],
      reason: 'missing subtask reviews: s2',
    })

    const result = await service.process({
      data: { missionId: 'm3', correlationId: 'c3', userId: 'u1', phase: 'review' },
    } as any)

    expect(result.status).toBe('review')
    expect(result.output).toEqual(
      expect.objectContaining({ reason: 'invalid_subtask_review_payload' }),
    )
    expect(service.stateRepo.insertLog).toHaveBeenCalledWith(
      supabase,
      expect.any(Object),
      'mission.progress',
      'review',
      'review',
      expect.objectContaining({
        note: expect.stringContaining('Review payload invalid'),
      }),
      'mgr',
    )
  })
})
