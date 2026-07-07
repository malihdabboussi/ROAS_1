-- Adds the toggle for showing the role/subtitle on the public embed widget.
-- Existing widgets default to true so behavior is unchanged.

alter table public.agents_registry
  add column if not exists widget_show_subtitle boolean not null default true;

comment on column public.agents_registry.widget_show_subtitle is
  'When false, the public widget hides the subtitle row entirely (used to suppress role display). Default true.';
