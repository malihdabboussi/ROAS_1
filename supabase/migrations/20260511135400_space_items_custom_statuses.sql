alter table public.space_items
  drop constraint if exists list_items_status_check;

alter table public.space_items
  add constraint list_items_status_check
  check (
    status is null
    or (
      length(trim(status)) > 0
      and length(status) <= 120
    )
  );
