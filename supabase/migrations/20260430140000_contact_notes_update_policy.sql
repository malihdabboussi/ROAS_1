-- Allow note authors to update their own notes; org owner/admin can update any note in their org
create policy "Users can update notes they authored or as org admin"
  on contact_notes for update
  using (
    user_id = auth.uid()
    or (
      org_id is not null
      and org_id in (
        select om.org_id from org_members om
        where om.user_id = auth.uid()
          and om.role in ('owner', 'admin')
          and om.status = 'active'
      )
    )
  )
  with check (
    user_id = auth.uid()
    or (
      org_id is not null
      and org_id in (
        select om.org_id from org_members om
        where om.user_id = auth.uid()
          and om.role in ('owner', 'admin')
          and om.status = 'active'
      )
    )
  );
