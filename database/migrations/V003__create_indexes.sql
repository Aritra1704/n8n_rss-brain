/*
  Migration number: V003
  Description: Creates performance indexes
  Depends on: V002 (tables must exist)
  Safe to re-run: Yes (uses IF NOT EXISTS)
*/

-- Use the application schema for object resolution in this migration.
SET search_path TO rss_brain;

BEGIN;

-- Speeds up queries that filter or join articles by source (for example: "latest from TechCrunch").
-- source_id is indexed because source-scoped listing is a primary dashboard and workflow access pattern.
CREATE INDEX IF NOT EXISTS idx_articles_source_id
  ON rss_brain.rss_articles(source_id);

-- Speeds up queue-processing queries that fetch unprocessed/processed article batches.
-- is_processed is indexed because the workflow frequently filters by this boolean state.
CREATE INDEX IF NOT EXISTS idx_articles_is_processed
  ON rss_brain.rss_articles(is_processed);

-- Speeds up "most recent articles first" queries used by feeds and dashboard timelines.
-- published_at is indexed in DESC order because recency sorting is a core read pattern.
CREATE INDEX IF NOT EXISTS idx_articles_published_at
  ON rss_brain.rss_articles(published_at DESC);

-- Speeds up duplicate detection and exact article URL lookups during ingestion.
-- url is indexed because article URL is the canonical deduplication key.
CREATE INDEX IF NOT EXISTS idx_articles_url
  ON rss_brain.rss_articles(url);

-- Speeds up joins from articles to summaries when rendering enriched article views.
-- article_id is indexed because summary retrieval is typically keyed by article relationship.
CREATE INDEX IF NOT EXISTS idx_summaries_article_id
  ON rss_brain.article_summaries(article_id);

-- Speeds up "latest digest runs" queries used for run history and operational monitoring.
-- run_at is indexed in DESC order because most UI/API requests prioritize newest runs.
CREATE INDEX IF NOT EXISTS idx_digest_runs_run_at
  ON rss_brain.digest_runs(run_at DESC);

-- Speeds up filtering digest runs by lifecycle state (running/completed/failed).
-- status is indexed because operational views and alerts commonly query by run state.
CREATE INDEX IF NOT EXISTS idx_digest_runs_status
  ON rss_brain.digest_runs(status);

COMMIT;
