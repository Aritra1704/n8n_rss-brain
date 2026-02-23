/*
  Migration number: V004
  Description: Creates dashboard view
  Depends on: V002, V003
  Safe to re-run: Yes (uses CREATE OR REPLACE VIEW)
*/

-- Use the application schema for object resolution in this migration.
SET search_path TO rss_brain;

BEGIN;

-- This view powers the dashboard UI by exposing a single, readable dataset that combines
-- source metadata, article details, AI summary output, and digest run status in one query.
-- Note: there is no direct FK from article rows to digest_runs, so we map each article to
-- the closest likely run timestamp (prefer first run at/after article publish/fetch time).
-- Compatibility note: if an older version of this view exists with a different column layout
-- (for example from init.sql bootstrap), drop it first so CREATE succeeds cleanly.
DROP VIEW IF EXISTS rss_brain.v_digest_dashboard;

CREATE OR REPLACE VIEW rss_brain.v_digest_dashboard AS
SELECT
  a.id AS article_id,
  a.title AS article_title,
  a.url AS article_url,
  a.author AS article_author,
  a.published_at AS article_published_at,
  s.name AS source_name,
  s.category AS source_category,
  sm.summary AS summary_text,
  sm.key_points AS summary_key_points,
  sm.sentiment AS summary_sentiment,
  sm.relevance_score AS summary_relevance_score,
  sm.tags AS summary_tags,
  dr.id AS digest_run_id,
  dr.run_at AS digest_run_at,
  dr.status AS digest_run_status,
  a.is_processed AS article_is_processed,
  a.is_relevant AS article_is_relevant
FROM rss_brain.rss_articles AS a
JOIN rss_brain.rss_sources AS s
  ON s.id = a.source_id
LEFT JOIN rss_brain.article_summaries AS sm
  ON sm.article_id = a.id
LEFT JOIN LATERAL (
  SELECT
    d.id,
    d.run_at,
    d.status
  FROM rss_brain.digest_runs AS d
  ORDER BY
    CASE
      WHEN d.run_at >= COALESCE(a.published_at, a.fetched_at) THEN 0
      ELSE 1
    END,
    CASE
      WHEN d.run_at >= COALESCE(a.published_at, a.fetched_at) THEN d.run_at
    END ASC NULLS LAST,
    d.run_at DESC
  LIMIT 1
) AS dr
  ON TRUE
ORDER BY a.published_at DESC NULLS LAST;

COMMIT;
