-- Raise file_size_limit on media and campaigns buckets to 2.5 GB
-- so presigned uploads can handle large video / document files.
UPDATE storage.buckets
SET file_size_limit = 2684354560
WHERE id IN ('media', 'campaigns');
