-- Add avatars, funnel_pages, sequence_emails to Realtime so Artifacts tab updates live
-- when artifacts are created/updated (e.g. during Vibey generation)
ALTER PUBLICATION supabase_realtime ADD TABLE avatars;
ALTER PUBLICATION supabase_realtime ADD TABLE funnel_pages;
ALTER PUBLICATION supabase_realtime ADD TABLE sequence_emails;
