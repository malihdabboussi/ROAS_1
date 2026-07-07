ALTER TABLE public.space_drive_folder_mappings
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'my_drive'
    CHECK (source IN ('my_drive','shared_with_me','shared_drives'));

UPDATE public.space_drive_folder_mappings
  SET source = 'shared_drives'
  WHERE drive_id IS NOT NULL AND source = 'my_drive';
