-- Visitors / Page Views tracking for campaign analytics
-- This powers "Visitors", "Page Views", and time-series charts.

-- ---------------------------------------------------------------------------
-- Table: visitors_page_views
-- ---------------------------------------------------------------------------

create table if not exists public.visitors_page_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  funnel_page_id uuid references public.funnel_pages(id) on delete set null,
  page_type text not null,
  visitor_hash text not null,
  ip text,
  user_agent text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  viewed_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

create index if not exists visitors_page_views_user_id_viewed_at_idx
  on public.visitors_page_views (user_id, viewed_at desc);

create index if not exists visitors_page_views_campaign_id_viewed_at_idx
  on public.visitors_page_views (campaign_id, viewed_at desc);

create index if not exists visitors_page_views_funnel_id_viewed_at_idx
  on public.visitors_page_views (funnel_id, viewed_at desc);

create index if not exists visitors_page_views_visitor_hash_idx
  on public.visitors_page_views (visitor_hash);

alter table public.visitors_page_views enable row level security;

drop policy if exists "visitors_page_views_select_own" on public.visitors_page_views;
create policy "visitors_page_views_select_own"
  on public.visitors_page_views
  for select
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RPC: record_page_view_secure
-- Called from the public funnels app (server-side) to insert a page view.
-- SECURITY DEFINER so it can be called by anon without RLS insert permissions.
-- ---------------------------------------------------------------------------

create or replace function public.record_page_view_secure(
  p_funnel_id uuid,
  p_funnel_page_id uuid,
  p_page_type text,
  p_visitor_hash text,
  p_ip text default null,
  p_user_agent text default null,
  p_referrer text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id uuid;
  v_campaign_id uuid;
begin
  select f.user_id, f.campaign_id
    into v_user_id, v_campaign_id
  from public.funnels f
  where f.id = p_funnel_id;

  if v_user_id is null then
    raise exception 'Funnel not found';
  end if;

  insert into public.visitors_page_views (
    user_id,
    campaign_id,
    funnel_id,
    funnel_page_id,
    page_type,
    visitor_hash,
    ip,
    user_agent,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    viewed_at
  ) values (
    v_user_id,
    v_campaign_id,
    p_funnel_id,
    p_funnel_page_id,
    p_page_type,
    p_visitor_hash,
    p_ip,
    p_user_agent,
    p_referrer,
    p_utm_source,
    p_utm_medium,
    p_utm_campaign,
    now()
  );
end;
$$;

revoke all on function public.record_page_view_secure(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public;

grant execute on function public.record_page_view_secure(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: get_campaign_analytics
-- Returns json consumed by apps/web campaign preview dashboard.
-- ---------------------------------------------------------------------------

create or replace function public.get_campaign_analytics(
  p_campaign_id uuid,
  p_start_date timestamp with time zone default null,
  p_end_date timestamp with time zone default null
) returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  result json;
begin
  with view_stats as (
    select
      count(*) as total_views,
      count(distinct visitor_hash) as unique_visitors
    from public.visitors_page_views
    where campaign_id = p_campaign_id
      and (p_start_date is null or viewed_at >= p_start_date)
      and (p_end_date is null or viewed_at <= p_end_date)
  ),
  lead_stats as (
    select
      count(*) as total_leads
    from public.leads
    where campaign_id = p_campaign_id
      and (p_start_date is null or created_at >= p_start_date)
      and (p_end_date is null or created_at <= p_end_date)
  ),
  daily_views as (
    select
      date(viewed_at) as day,
      count(distinct visitor_hash) as visitors
    from public.visitors_page_views
    where campaign_id = p_campaign_id
      and (p_start_date is null or viewed_at >= p_start_date)
      and (p_end_date is null or viewed_at <= p_end_date)
    group by date(viewed_at)
  ),
  daily_leads as (
    select
      date(created_at) as day,
      count(*) as leads
    from public.leads
    where campaign_id = p_campaign_id
      and (p_start_date is null or created_at >= p_start_date)
      and (p_end_date is null or created_at <= p_end_date)
    group by date(created_at)
  ),
  daily as (
    select
      d.day,
      coalesce(v.visitors, 0) as visitors,
      coalesce(l.leads, 0) as leads
    from (
      select day from daily_views
      union
      select day from daily_leads
    ) d
    left join daily_views v on v.day = d.day
    left join daily_leads l on l.day = d.day
    order by d.day
  )
  select json_build_object(
    'visitors', coalesce((select unique_visitors from view_stats), 0),
    'total_views', coalesce((select total_views from view_stats), 0),
    'leads', coalesce((select total_leads from lead_stats), 0),
    'conversion_rate',
      case
        when coalesce((select unique_visitors from view_stats), 0) = 0 then 0
        else round(
          (coalesce((select total_leads from lead_stats), 0)::numeric /
           nullif((select unique_visitors from view_stats), 0)::numeric) * 100,
          2
        )
      end,
    'chart_data',
      coalesce(
        (select json_agg(json_build_object('date', day, 'visitors', visitors, 'leads', leads)) from daily),
        '[]'::json
      )
  ) into result;

  return result;
end;
$function$;

revoke all on function public.get_campaign_analytics(uuid, timestamp with time zone, timestamp with time zone) from public;
grant execute on function public.get_campaign_analytics(uuid, timestamp with time zone, timestamp with time zone) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: get_campaign_email_analytics
-- Sequence email analytics (opens/clicks) for a campaign.
-- ---------------------------------------------------------------------------

create or replace function public.get_campaign_email_analytics(
  p_campaign_id uuid,
  p_start_date timestamp with time zone default null,
  p_end_date timestamp with time zone default null
) returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  result json;
begin
  with seq as (
    select s.id
    from public.sequences s
    where s.campaign_id = p_campaign_id
  ),
  sends as (
    select es.*
    from public.email_sends es
    where es.sequence_id in (select id from seq)
  ),
  stats as (
    select
      count(*) filter (where sent_at is not null) as sent,
      count(*) filter (where delivered_at is not null) as delivered,
      count(*) filter (where opened_at is not null) as opened,
      count(*) filter (where clicked_at is not null) as clicked,
      count(*) filter (where status in ('bounced', 'failed')) as bounced
    from sends
    where (p_start_date is null or created_at >= p_start_date)
      and (p_end_date is null or created_at <= p_end_date)
  ),
  daily_opens as (
    select
      date(opened_at) as day,
      count(*) as opens
    from sends
    where opened_at is not null
      and (p_start_date is null or opened_at >= p_start_date)
      and (p_end_date is null or opened_at <= p_end_date)
    group by date(opened_at)
  ),
  daily_clicks as (
    select
      date(clicked_at) as day,
      count(*) as clicks
    from sends
    where clicked_at is not null
      and (p_start_date is null or clicked_at >= p_start_date)
      and (p_end_date is null or clicked_at <= p_end_date)
    group by date(clicked_at)
  ),
  daily as (
    select
      d.day,
      coalesce(o.opens, 0) as opens,
      coalesce(c.clicks, 0) as clicks
    from (
      select day from daily_opens
      union
      select day from daily_clicks
    ) d
    left join daily_opens o on o.day = d.day
    left join daily_clicks c on c.day = d.day
    order by d.day
  )
  select json_build_object(
    'sent', coalesce((select sent from stats), 0),
    'delivered', coalesce((select delivered from stats), 0),
    'opened', coalesce((select opened from stats), 0),
    'clicked', coalesce((select clicked from stats), 0),
    'bounced', coalesce((select bounced from stats), 0),
    'open_rate',
      case
        when coalesce((select sent from stats), 0) = 0 then 0
        else round(
          (coalesce((select opened from stats), 0)::numeric /
           nullif((select sent from stats), 0)::numeric) * 100,
          2
        )
      end,
    'click_rate',
      case
        when coalesce((select sent from stats), 0) = 0 then 0
        else round(
          (coalesce((select clicked from stats), 0)::numeric /
           nullif((select sent from stats), 0)::numeric) * 100,
          2
        )
      end,
    'chart_data',
      coalesce(
        (select json_agg(json_build_object('date', day, 'opens', opens, 'clicks', clicks)) from daily),
        '[]'::json
      )
  ) into result;

  return result;
end;
$function$;

revoke all on function public.get_campaign_email_analytics(uuid, timestamp with time zone, timestamp with time zone) from public;
grant execute on function public.get_campaign_email_analytics(uuid, timestamp with time zone, timestamp with time zone) to anon, authenticated;
;
