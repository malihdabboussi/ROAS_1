SELECT
  COUNT(*) AS total_memories,
  COUNT(embedding) AS with_embedding,
  COUNT(*) - COUNT(embedding) AS missing_embedding
FROM brain_memories
WHERE deleted_at IS NULL;
