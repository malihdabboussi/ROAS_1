-- Ad analytics RPC for campaign dashboard
create or replace function public.get_campaign_ad_analytics(
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
  with ad_visitors as (
    select
      count(distinct visitor_hash) as unique_visitors,
      count(*) as total_views
    from public.visitors_page_views
    where campaign_id = p_campaign_id
      and utm_content is not null
      and (p_start_date is null or viewed_at >= p_start_date)
      and (p_end_date is null or viewed_at <= p_end_date)
  ),
  ad_leads as (
    select count(*) as total_leads
    from public.leads
    where campaign_id = p_campaign_id
      and ad_id is not null
      and (p_start_date is null or created_at >= p_start_date)
      and (p_end_date is null or created_at <= p_end_date)
  ),
  active_ads as (
    select count(*) as total_ads
    from public.ads
    where campaign_id = p_campaign_id
  ),
  daily_leads as (
    select date(created_at) as day, count(*) as leads
    from public.leads
    where campaign_id = p_campaign_id
      and ad_id is not null
      and (p_start_date is null or created_at >= p_start_date)
      and (p_end_date is null or created_at <= p_end_date)
    group by date(created_at)
  ),
  daily_visitors as (
    select date(viewed_at) as day, count(distinct visitor_hash) as visitors
    from public.visitors_page_views
    where campaign_id = p_campaign_id
      and utm_content is not null
      and (p_start_date is null or viewed_at >= p_start_date)
      and (p_end_date is null or viewed_at <= p_end_date)
    group by date(viewed_at)
  ),
  daily as (
    select
      coalesce(dv.day, dl.day) as day,
      coalesce(dv.visitors, 0) as visitors,
      coalesce(dl.leads, 0) as leads
    from daily_visitors dv
    full outer join daily_leads dl on dl.day = dv.day
    order by day
  ),
  campaign_breakdown as (
    select
      ac.id as ad_campaign_id,
      ac.name as campaign_name,
      ac.objective,
      (select count(*) from public.ad_sets s where s.ad_campaign_id = ac.id) as ad_sets_count,
      (select count(*) from public.ads a2 join public.ad_sets s2 on s2.id = a2.ad_set_id where s2.ad_campaign_id = ac.id) as ads_count,
      (select count(*) from public.leads l2 where l2.ad_campaign_id = ac.id
        and (p_start_date is null or l2.created_at >= p_start_date)
        and (p_end_date is null or l2.created_at <= p_end_date)
      ) as leads_count,
      (select coalesce(sum(s3.daily_budget), 0) from public.ad_sets s3 where s3.ad_campaign_id = ac.id) as total_daily_budget
    from public.ad_campaigns ac
    where ac.campaign_id = p_campaign_id
  )
  select json_build_object(
    'ad_visitors', coalesce((select unique_visitors from ad_visitors), 0),
    'ad_views', coalesce((select total_views from ad_visitors), 0),
    'ad_leads', coalesce((select total_leads from ad_leads), 0),
    'total_ads', coalesce((select total_ads from active_ads), 0),
    'conversion_rate', case
      when coalesce((select unique_visitors from ad_visitors), 0) = 0 then 0
      else round(coalesce((select total_leads from ad_leads), 0)::numeric / (select unique_visitors from ad_visitors) * 100, 2)
    end,
    'chart_data', coalesce((select json_agg(json_build_object('date', day, 'visitors', visitors, 'leads', leads)) from daily), '[]'::json),
    'breakdown', coalesce((select json_agg(json_build_object(
      'ad_campaign_id', ad_campaign_id,
      'campaign_name', campaign_name,
      'objective', objective,
      'ad_sets_count', ad_sets_count,
      'ads_count', ads_count,
      'leads_count', leads_count,
      'daily_budget', total_daily_budget
    )) from campaign_breakdown), '[]'::json)
  ) into result;

  return result;
end;
$function$;

grant execute on function public.get_campaign_ad_analytics(uuid, timestamp with time zone, timestamp with time zone) to authenticated;
