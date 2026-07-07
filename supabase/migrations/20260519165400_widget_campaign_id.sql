-- Lets each public website widget send captured contacts to one explicit campaign.

alter table public.agents_registry
  add column if not exists widget_campaign_id uuid references public.campaigns(id) on delete set null;

create index if not exists idx_agents_registry_widget_campaign
  on public.agents_registry (widget_campaign_id)
  where widget_campaign_id is not null;

comment on column public.agents_registry.widget_campaign_id is
  'Optional campaign destination for contacts captured through this agent website widget.';
