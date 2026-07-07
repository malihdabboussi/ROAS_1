-- Adds a dedicated `description` column on space_items so the modal description
-- and the schema "Notes" field are independent (previously both bound to `notes`).

ALTER TABLE public.space_items
  ADD COLUMN IF NOT EXISTS description TEXT;
