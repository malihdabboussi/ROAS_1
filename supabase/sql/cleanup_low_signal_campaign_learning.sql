-- Cleanup low-signal campaign learning nodes.
-- Run preview first, then run delete query.

-- 1) Preview candidates
select
  id,
  campaign_id,
  title,
  left(content, 200) as preview
from campaign_nodes
where node_type = 'agent_learning'
  and (
    lower(title) = 'manager review insight'
    or
    (
      lower(content) ~ '(well[- ]written|strong (delivery|hook|output)|great job|good job|nice work|looks good|approved)'
      and lower(content) !~ '(brand|audience|offer|pricing|positioning|tone|voice|strategy|constraint|campaign|avatar|persona|objection|messaging|cta|funnel)'
    )
    or char_length(trim(content)) < 80
  )
order by created_at desc;

-- 2) Delete candidates (hard delete)
delete from campaign_nodes
where id in (
  select id
  from campaign_nodes
  where node_type = 'agent_learning'
    and (
      lower(title) = 'manager review insight'
      or
      (
        lower(content) ~ '(well[- ]written|strong (delivery|hook|output)|great job|good job|nice work|looks good|approved)'
        and lower(content) !~ '(brand|audience|offer|pricing|positioning|tone|voice|strategy|constraint|campaign|avatar|persona|objection|messaging|cta|funnel)'
      )
      or char_length(trim(content)) < 80
    )
)
returning id, campaign_id, title;
