-- Verification for <ts>_contacts_source_channel_normalization.sql
-- Run on a Supabase dev branch (and prod after deploy).

-- 1. No contact_source outside the canonical channel enum (must return 0 rows)
SELECT contact_source, count(*)
FROM contacts
WHERE contact_source IS NOT NULL
  AND contact_source NOT IN
    ('funnel','form','widget','telegram','import','manual','automation','integration')
GROUP BY contact_source;

-- 2. Distribution after normalization (eyeball: legacy values folded into channel + detail)
SELECT contact_source, contact_source_detail, count(*)
FROM contacts
GROUP BY contact_source, contact_source_detail
ORDER BY count(*) DESC;

-- 3. Legacy import variants carried their detail (expect csv/activecampaign/gohighlevel counts > 0
--    if such contacts existed pre-migration)
SELECT contact_source_detail, count(*)
FROM contacts
WHERE contact_source = 'import'
GROUP BY contact_source_detail;
