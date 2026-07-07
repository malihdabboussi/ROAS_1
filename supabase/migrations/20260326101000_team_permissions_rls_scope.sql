-- Team permissions RLS expansion across campaign-scoped and brain-scoped data.

-- Campaign and mission core.
create policy team_campaigns_view
  on public.campaigns for select
  using (public.has_team_campaign_access(id, 'view'));

create policy team_campaigns_edit
  on public.campaigns for update
  using (public.has_team_campaign_access(id, 'edit'))
  with check (public.has_team_campaign_access(id, 'edit'));

create policy team_missions_view
  on public.missions for select
  using (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'view')
  );

create policy team_missions_edit
  on public.missions for update
  using (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'edit')
  )
  with check (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'edit')
  );

create policy team_missions_insert
  on public.missions for insert
  with check (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'edit')
  );

create policy team_missions_delete
  on public.missions for delete
  using (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'edit')
  );

-- Campaign graph, workflows, and assignments.
create policy team_campaign_agents_view
  on public.campaign_agents for select
  using (public.has_team_campaign_access(campaign_id, 'view'));

create policy team_campaign_agents_edit
  on public.campaign_agents for all
  using (public.has_team_campaign_access(campaign_id, 'edit'))
  with check (public.has_team_campaign_access(campaign_id, 'edit'));

create policy team_campaign_tasks_all
  on public.campaign_tasks for all
  using (public.has_team_campaign_access(campaign_id, 'view'))
  with check (public.has_team_campaign_access(campaign_id, 'edit'));

create policy team_campaign_plans_all
  on public.campaign_plans for all
  using (public.has_team_campaign_access(campaign_id, 'view'))
  with check (public.has_team_campaign_access(campaign_id, 'edit'));

create policy team_campaign_nodes_all
  on public.campaign_nodes for all
  using (public.has_team_campaign_access(campaign_id, 'view'))
  with check (public.has_team_campaign_access(campaign_id, 'edit'));

create policy team_campaign_node_sources_all
  on public.campaign_node_sources for all
  using (
    exists (
      select 1
      from public.campaign_nodes cn
      where cn.id = campaign_node_sources.node_id
        and public.has_team_campaign_access(cn.campaign_id, 'view')
    )
  )
  with check (
    exists (
      select 1
      from public.campaign_nodes cn
      where cn.id = campaign_node_sources.node_id
        and public.has_team_campaign_access(cn.campaign_id, 'edit')
    )
  );

create policy team_campaign_edges_all
  on public.campaign_edges for all
  using (public.has_team_campaign_access(campaign_id, 'view'))
  with check (public.has_team_campaign_access(campaign_id, 'edit'));

create policy team_campaign_workflows_all
  on public.campaign_workflows for all
  using (public.has_team_campaign_access(campaign_id, 'view'))
  with check (public.has_team_campaign_access(campaign_id, 'edit'));

create policy team_campaign_workflow_edges_all
  on public.campaign_workflow_edges for all
  using (
    exists (
      select 1
      from public.campaign_workflows cw
      where cw.id = campaign_workflow_edges.workflow_id
        and public.has_team_campaign_access(cw.campaign_id, 'view')
    )
  )
  with check (
    exists (
      select 1
      from public.campaign_workflows cw
      where cw.id = campaign_workflow_edges.workflow_id
        and public.has_team_campaign_access(cw.campaign_id, 'edit')
    )
  );

create policy team_campaign_workflow_layouts_all
  on public.campaign_workflow_layouts for all
  using (
    exists (
      select 1
      from public.campaign_workflows cw
      where cw.id = campaign_workflow_layouts.workflow_id
        and public.has_team_campaign_access(cw.campaign_id, 'view')
    )
  )
  with check (
    exists (
      select 1
      from public.campaign_workflows cw
      where cw.id = campaign_workflow_layouts.workflow_id
        and public.has_team_campaign_access(cw.campaign_id, 'edit')
    )
  );

create policy team_campaign_strategy_nodes_all
  on public.campaign_strategy_nodes for all
  using (public.has_team_campaign_access(campaign_id, 'view'))
  with check (public.has_team_campaign_access(campaign_id, 'edit'));

-- Mission child tables.
create policy team_missions_logs_all
  on public.missions_logs for all
  using (
    exists (
      select 1
      from public.missions m
      where m.id = missions_logs.mission_id
        and m.campaign_id is not null
        and public.has_team_campaign_access(m.campaign_id, 'view')
    )
  )
  with check (
    exists (
      select 1
      from public.missions m
      where m.id = missions_logs.mission_id
        and m.campaign_id is not null
        and public.has_team_campaign_access(m.campaign_id, 'edit')
    )
  );

create policy team_missions_plans_all
  on public.missions_plans for all
  using (
    exists (
      select 1
      from public.missions m
      where m.id = missions_plans.mission_id
        and m.campaign_id is not null
        and public.has_team_campaign_access(m.campaign_id, 'view')
    )
  )
  with check (
    exists (
      select 1
      from public.missions m
      where m.id = missions_plans.mission_id
        and m.campaign_id is not null
        and public.has_team_campaign_access(m.campaign_id, 'edit')
    )
  );

create policy team_mission_subtasks_all
  on public.mission_subtasks for all
  using (
    exists (
      select 1
      from public.missions m
      where m.id = mission_subtasks.mission_id
        and m.campaign_id is not null
        and public.has_team_campaign_access(m.campaign_id, 'view')
    )
  )
  with check (
    exists (
      select 1
      from public.missions m
      where m.id = mission_subtasks.mission_id
        and m.campaign_id is not null
        and public.has_team_campaign_access(m.campaign_id, 'edit')
    )
  );

create policy team_mission_deliverables_all
  on public.mission_deliverables for all
  using (
    exists (
      select 1
      from public.missions m
      where m.id = mission_deliverables.mission_id
        and m.campaign_id is not null
        and public.has_team_campaign_access(m.campaign_id, 'view')
    )
  )
  with check (
    exists (
      select 1
      from public.missions m
      where m.id = mission_deliverables.mission_id
        and m.campaign_id is not null
        and public.has_team_campaign_access(m.campaign_id, 'edit')
    )
  );

-- Artifact tables.
create policy team_offers_all
  on public.offers for all
  using (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'view')
  )
  with check (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'edit')
  );

create policy team_avatars_all
  on public.avatars for all
  using (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'view')
  )
  with check (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'edit')
  );

create policy team_funnels_all
  on public.funnels for all
  using (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'view')
  )
  with check (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'edit')
  );

create policy team_funnel_pages_all
  on public.funnel_pages for all
  using (
    exists (
      select 1
      from public.funnels f
      where f.id = funnel_pages.funnel_id
        and f.campaign_id is not null
        and public.has_team_campaign_access(f.campaign_id, 'view')
    )
  )
  with check (
    exists (
      select 1
      from public.funnels f
      where f.id = funnel_pages.funnel_id
        and f.campaign_id is not null
        and public.has_team_campaign_access(f.campaign_id, 'edit')
    )
  );

create policy team_lead_magnets_all
  on public.lead_magnets for all
  using (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'view')
  )
  with check (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'edit')
  );

create policy team_sequences_all
  on public.sequences for all
  using (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'view')
  )
  with check (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'edit')
  );

create policy team_sequence_emails_all
  on public.sequence_emails for all
  using (
    exists (
      select 1
      from public.sequences s
      where s.id = sequence_emails.sequence_id
        and s.campaign_id is not null
        and public.has_team_campaign_access(s.campaign_id, 'view')
    )
  )
  with check (
    exists (
      select 1
      from public.sequences s
      where s.id = sequence_emails.sequence_id
        and s.campaign_id is not null
        and public.has_team_campaign_access(s.campaign_id, 'edit')
    )
  );

create policy team_ad_campaigns_all
  on public.ad_campaigns for all
  using (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'view')
  )
  with check (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'edit')
  );

create policy team_ad_sets_all
  on public.ad_sets for all
  using (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'view')
  )
  with check (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'edit')
  );

create policy team_ads_all
  on public.ads for all
  using (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'view')
  )
  with check (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'edit')
  );

create policy team_social_posts_all
  on public.social_posts for all
  using (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'view')
  )
  with check (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'edit')
  );

create policy team_blog_posts_all
  on public.blog_posts for all
  using (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'view')
  )
  with check (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'edit')
  );

-- Teams and tasks.
create policy team_agents_registry_view
  on public.agents_registry for select
  using (
    exists (
      select 1
      from public.campaign_agents ca
      where ca.user_id = agents_registry.user_id
        and ca.agent_key = agents_registry.agent_key
        and public.has_team_campaign_access(ca.campaign_id, 'view')
    )
  );

create policy team_agents_registry_edit
  on public.agents_registry for update
  using (
    exists (
      select 1
      from public.campaign_agents ca
      where ca.user_id = agents_registry.user_id
        and ca.agent_key = agents_registry.agent_key
        and public.has_team_campaign_access(ca.campaign_id, 'edit')
    )
  )
  with check (
    exists (
      select 1
      from public.campaign_agents ca
      where ca.user_id = agents_registry.user_id
        and ca.agent_key = agents_registry.agent_key
        and public.has_team_campaign_access(ca.campaign_id, 'edit')
    )
  );

create policy team_tasks_all
  on public.tasks for all
  using (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'view')
  )
  with check (
    campaign_id is not null
    and public.has_team_campaign_access(campaign_id, 'edit')
  );

-- Brain sharing policies.
create policy team_ns_brains_view
  on public.ns_brains for select
  using (
    public.has_team_brain_access(id, 'view')
    or public.has_team_agent_brain_access(id, 'view')
  );

create policy team_ns_brains_edit
  on public.ns_brains for update
  using (
    public.has_team_brain_access(id, 'edit')
    or public.has_team_agent_brain_access(id, 'edit')
  )
  with check (
    public.has_team_brain_access(id, 'edit')
    or public.has_team_agent_brain_access(id, 'edit')
  );

create policy team_ns_memories_all
  on public.ns_memories for all
  using (
    exists (
      select 1
      from public.ns_brains b
      where b.id = ns_memories.brain_id
        and (
          public.has_team_brain_access(b.id, 'view')
          or public.has_team_agent_brain_access(b.id, 'view')
        )
    )
  )
  with check (
    exists (
      select 1
      from public.ns_brains b
      where b.id = ns_memories.brain_id
        and (
          public.has_team_brain_access(b.id, 'edit')
          or public.has_team_agent_brain_access(b.id, 'edit')
        )
    )
  );

create policy team_ns_snapshots_all
  on public.ns_snapshots for all
  using (
    exists (
      select 1
      from public.ns_brains b
      where b.id = ns_snapshots.brain_id
        and (
          public.has_team_brain_access(b.id, 'view')
          or public.has_team_agent_brain_access(b.id, 'view')
        )
    )
  )
  with check (
    exists (
      select 1
      from public.ns_brains b
      where b.id = ns_snapshots.brain_id
        and (
          public.has_team_brain_access(b.id, 'edit')
          or public.has_team_agent_brain_access(b.id, 'edit')
        )
    )
  );

create policy team_ns_sk_sources_all
  on public.ns_sk_sources for all
  using (
    exists (
      select 1
      from public.ns_brains b
      where b.id = ns_sk_sources.brain_id
        and (
          public.has_team_brain_access(b.id, 'view')
          or public.has_team_agent_brain_access(b.id, 'view')
        )
    )
  )
  with check (
    exists (
      select 1
      from public.ns_brains b
      where b.id = ns_sk_sources.brain_id
        and (
          public.has_team_brain_access(b.id, 'edit')
          or public.has_team_agent_brain_access(b.id, 'edit')
        )
    )
  );

create policy team_ns_sk_entries_all
  on public.ns_sk_entries for all
  using (
    exists (
      select 1
      from public.ns_brains b
      where b.id = ns_sk_entries.brain_id
        and (
          public.has_team_brain_access(b.id, 'view')
          or public.has_team_agent_brain_access(b.id, 'view')
        )
    )
  )
  with check (
    exists (
      select 1
      from public.ns_brains b
      where b.id = ns_sk_entries.brain_id
        and (
          public.has_team_brain_access(b.id, 'edit')
          or public.has_team_agent_brain_access(b.id, 'edit')
        )
    )
  );

create policy team_ns_sk_gaps_all
  on public.ns_sk_gaps for all
  using (
    exists (
      select 1
      from public.ns_brains b
      where b.id = ns_sk_gaps.brain_id
        and (
          public.has_team_brain_access(b.id, 'view')
          or public.has_team_agent_brain_access(b.id, 'view')
        )
    )
  )
  with check (
    exists (
      select 1
      from public.ns_brains b
      where b.id = ns_sk_gaps.brain_id
        and (
          public.has_team_brain_access(b.id, 'edit')
          or public.has_team_agent_brain_access(b.id, 'edit')
        )
    )
  );

create policy team_ns_sk_evolution_all
  on public.ns_sk_evolution for all
  using (
    exists (
      select 1
      from public.ns_sk_entries e
      join public.ns_brains b on b.id = e.brain_id
      where e.id = ns_sk_evolution.entry_id
        and (
          public.has_team_brain_access(b.id, 'view')
          or public.has_team_agent_brain_access(b.id, 'view')
        )
    )
  )
  with check (
    exists (
      select 1
      from public.ns_sk_entries e
      join public.ns_brains b on b.id = e.brain_id
      where e.id = ns_sk_evolution.entry_id
        and (
          public.has_team_brain_access(b.id, 'edit')
          or public.has_team_agent_brain_access(b.id, 'edit')
        )
    )
  );

create policy team_ns_sk_curriculum_all
  on public.ns_sk_curriculum for all
  using (
    exists (
      select 1
      from public.ns_brains b
      where b.id = ns_sk_curriculum.brain_id
        and (
          public.has_team_brain_access(b.id, 'view')
          or public.has_team_agent_brain_access(b.id, 'view')
        )
    )
  )
  with check (
    exists (
      select 1
      from public.ns_brains b
      where b.id = ns_sk_curriculum.brain_id
        and (
          public.has_team_brain_access(b.id, 'edit')
          or public.has_team_agent_brain_access(b.id, 'edit')
        )
    )
  );

create policy team_ns_memory_connections_all
  on public.ns_memory_connections for all
  using (
    exists (
      select 1
      from public.ns_memories m
      join public.ns_brains b on b.id = m.brain_id
      where m.id = ns_memory_connections.source_memory_id
        and (
          public.has_team_brain_access(b.id, 'view')
          or public.has_team_agent_brain_access(b.id, 'view')
        )
    )
  )
  with check (
    exists (
      select 1
      from public.ns_memories m
      join public.ns_brains b on b.id = m.brain_id
      where m.id = ns_memory_connections.source_memory_id
        and (
          public.has_team_brain_access(b.id, 'edit')
          or public.has_team_agent_brain_access(b.id, 'edit')
        )
    )
  );

create policy team_ns_memory_sessions_all
  on public.ns_memory_sessions for all
  using (
    exists (
      select 1
      from public.ns_brains b
      where b.id = ns_memory_sessions.brain_id
        and (
          public.has_team_brain_access(b.id, 'view')
          or public.has_team_agent_brain_access(b.id, 'view')
        )
    )
  )
  with check (
    exists (
      select 1
      from public.ns_brains b
      where b.id = ns_memory_sessions.brain_id
        and (
          public.has_team_brain_access(b.id, 'edit')
          or public.has_team_agent_brain_access(b.id, 'edit')
        )
    )
  );

create policy team_ns_memory_versions_all
  on public.ns_memory_versions for all
  using (
    exists (
      select 1
      from public.ns_memories m
      join public.ns_brains b on b.id = m.brain_id
      where m.id = ns_memory_versions.memory_id
        and (
          public.has_team_brain_access(b.id, 'view')
          or public.has_team_agent_brain_access(b.id, 'view')
        )
    )
  )
  with check (
    exists (
      select 1
      from public.ns_memories m
      join public.ns_brains b on b.id = m.brain_id
      where m.id = ns_memory_versions.memory_id
        and (
          public.has_team_brain_access(b.id, 'edit')
          or public.has_team_agent_brain_access(b.id, 'edit')
        )
    )
  );

create policy team_ns_snapshot_edges_all
  on public.ns_snapshot_edges for all
  using (
    exists (
      select 1
      from public.ns_snapshots s
      join public.ns_brains b on b.id = s.brain_id
      where s.id = ns_snapshot_edges.source_id
        and (
          public.has_team_brain_access(b.id, 'view')
          or public.has_team_agent_brain_access(b.id, 'view')
        )
    )
  )
  with check (
    exists (
      select 1
      from public.ns_snapshots s
      join public.ns_brains b on b.id = s.brain_id
      where s.id = ns_snapshot_edges.source_id
        and (
          public.has_team_brain_access(b.id, 'edit')
          or public.has_team_agent_brain_access(b.id, 'edit')
        )
    )
  );

create policy team_ns_emotional_responses_all
  on public.ns_emotional_responses for all
  using (
    exists (
      select 1
      from public.ns_memories m
      join public.ns_brains b on b.id = m.brain_id
      where m.id = ns_emotional_responses.memory_id
        and (
          public.has_team_brain_access(b.id, 'view')
          or public.has_team_agent_brain_access(b.id, 'view')
        )
    )
  )
  with check (
    exists (
      select 1
      from public.ns_memories m
      join public.ns_brains b on b.id = m.brain_id
      where m.id = ns_emotional_responses.memory_id
        and (
          public.has_team_brain_access(b.id, 'edit')
          or public.has_team_agent_brain_access(b.id, 'edit')
        )
    )
  );

create policy team_ns_pending_captures_all
  on public.ns_pending_captures for all
  using (
    exists (
      select 1
      from public.ns_brains b
      where b.id = ns_pending_captures.brain_id
        and (
          public.has_team_brain_access(b.id, 'view')
          or public.has_team_agent_brain_access(b.id, 'view')
        )
    )
  )
  with check (
    exists (
      select 1
      from public.ns_brains b
      where b.id = ns_pending_captures.brain_id
        and (
          public.has_team_brain_access(b.id, 'edit')
          or public.has_team_agent_brain_access(b.id, 'edit')
        )
    )
  );

create policy team_ns_content_hashes_all
  on public.ns_content_hashes for all
  using (
    exists (
      select 1
      from public.ns_brains b
      where b.id = ns_content_hashes.brain_id
        and (
          public.has_team_brain_access(b.id, 'view')
          or public.has_team_agent_brain_access(b.id, 'view')
        )
    )
  )
  with check (
    exists (
      select 1
      from public.ns_brains b
      where b.id = ns_content_hashes.brain_id
        and (
          public.has_team_brain_access(b.id, 'edit')
          or public.has_team_agent_brain_access(b.id, 'edit')
        )
    )
  );
