-- One-time backfill to resync denormalized posts.comment_count from comments table.

UPDATE posts p
SET comment_count = sub.total_comments
FROM (
  SELECT post_id, COUNT(*)::int AS total_comments
  FROM comments
  GROUP BY post_id
) sub
WHERE p.id = sub.post_id
  AND p.comment_count <> sub.total_comments;

-- Set orphaned rows (posts with no comments) to 0 where stale values exist.
UPDATE posts p
SET comment_count = 0
WHERE NOT EXISTS (
  SELECT 1 FROM comments c WHERE c.post_id = p.id
)
AND p.comment_count <> 0;
