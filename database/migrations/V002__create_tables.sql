/*
  Migration number: V002
  Description: Creates all core tables
  Depends on: V001 (schema must exist)
  Safe to re-run: Yes (uses IF NOT EXISTS)
*/

-- Use the application schema for object resolution in this migration.
SET search_path TO rss_brain;

BEGIN;

-- ============================================================
-- 1) TABLE: rss_sources
-- Design decision:
-- - Feed configuration is separated from fetched article data so feeds
--   can be enabled/disabled/reconfigured without touching article history.
-- ============================================================
CREATE TABLE IF NOT EXISTS rss_brain.rss_sources (
  id SERIAL PRIMARY KEY, -- Surrogate primary key for internal joins and references.
  name VARCHAR(255) NOT NULL, -- Human-readable source name (for example: "TechCrunch").
  url TEXT NOT NULL UNIQUE, -- Canonical RSS feed URL; UNIQUE prevents duplicate source rows.
  category VARCHAR(100) DEFAULT 'general', -- Logical grouping for filtering (tech, finance, world, etc.).
  is_active BOOLEAN DEFAULT true, -- Soft toggle to include/exclude this source from polling.
  fetch_frequency_minutes INTEGER DEFAULT 60, -- Per-source polling interval to support different feed cadences.
  last_fetched_at TIMESTAMP, -- Timestamp of last successful fetch for scheduler decisions.
  created_at TIMESTAMP DEFAULT NOW(), -- Row creation timestamp for auditability.
  updated_at TIMESTAMP DEFAULT NOW() -- Row update timestamp, maintained by trigger on UPDATE.
);

-- ============================================================
-- 2) TABLE: rss_articles
-- Design decision:
-- - Raw fetched data is preserved before AI processing, enabling
--   reprocessing, debugging, and historical traceability.
-- ============================================================
CREATE TABLE IF NOT EXISTS rss_brain.rss_articles (
  id SERIAL PRIMARY KEY, -- Surrogate primary key for internal joins and references.
  source_id INTEGER REFERENCES rss_brain.rss_sources(id) ON DELETE CASCADE, -- Parent feed link; delete articles automatically if source is removed.
  title TEXT NOT NULL, -- Raw article title from feed item.
  url TEXT NOT NULL UNIQUE, -- Canonical article URL; UNIQUE deduplicates recurring feed entries.
  description TEXT, -- Feed excerpt/summary payload before AI enrichment.
  content TEXT, -- Optional full article body when present in feed payload.
  author VARCHAR(255), -- Author metadata when available from source.
  published_at TIMESTAMP, -- Original publish timestamp from feed metadata.
  fetched_at TIMESTAMP DEFAULT NOW(), -- Timestamp when rss-brain ingested this article.
  is_processed BOOLEAN DEFAULT false, -- Marks whether AI processing has completed.
  is_relevant BOOLEAN DEFAULT true, -- Relevance gate result for digest inclusion.
  created_at TIMESTAMP DEFAULT NOW() -- Row creation timestamp for auditability.
);

-- ============================================================
-- 3) TABLE: article_summaries
-- Design decision:
-- - Summary data is separated from raw articles so AI output can evolve
--   independently and remain optional (articles may exist unsummarized).
-- - article_id is UNIQUE to enforce one summary per article.
-- ============================================================
CREATE TABLE IF NOT EXISTS rss_brain.article_summaries (
  id SERIAL PRIMARY KEY, -- Surrogate primary key for summary records.
  article_id INTEGER REFERENCES rss_brain.rss_articles(id) ON DELETE CASCADE UNIQUE, -- One-to-one relationship with source article.
  summary TEXT NOT NULL, -- AI-generated narrative summary text.
  key_points TEXT[], -- Ordered takeaway bullets (typically 3-5 points).
  sentiment VARCHAR(20), -- Sentiment classification (positive/negative/neutral).
  relevance_score DECIMAL(3,2) CHECK (relevance_score >= 0.00 AND relevance_score <= 1.00), -- Normalized relevance score for ranking/filtering.
  tags TEXT[], -- AI-generated topic tags for grouping and quick filtering.
  model_used VARCHAR(100) DEFAULT 'gpt-4o-mini', -- OpenAI model identifier used for this summary.
  tokens_used INTEGER, -- Token consumption for monitoring and cost analysis.
  created_at TIMESTAMP DEFAULT NOW() -- Row creation timestamp for auditability.
);

-- ============================================================
-- 4) TABLE: digest_runs
-- Design decision:
-- - Workflow-run metadata is stored separately from article entities,
--   making operational monitoring and failure analysis straightforward.
-- ============================================================
CREATE TABLE IF NOT EXISTS rss_brain.digest_runs (
  id SERIAL PRIMARY KEY, -- Surrogate primary key for each digest execution record.
  run_at TIMESTAMP DEFAULT NOW(), -- Start timestamp of this digest run.
  status VARCHAR(50) DEFAULT 'running', -- Execution state (running/completed/failed).
  articles_fetched INTEGER DEFAULT 0, -- Number of articles fetched in this run.
  articles_summarized INTEGER DEFAULT 0, -- Number of articles summarized in this run.
  digest_html TEXT, -- Final rendered HTML digest payload.
  digest_markdown TEXT, -- Markdown digest payload for alternate channels.
  error_message TEXT, -- Captured failure reason when status is failed.
  duration_seconds INTEGER, -- End-to-end runtime for performance tracking.
  triggered_by VARCHAR(100) DEFAULT 'schedule', -- Run origin (schedule/manual).
  created_at TIMESTAMP DEFAULT NOW() -- Row creation timestamp for auditability.
);

-- ============================================================
-- FUNCTION + TRIGGER: maintain rss_sources.updated_at
-- Design decision:
-- - Centralizes timestamp maintenance in DB logic so all clients/tools
--   get consistent updated_at behavior without app-side duplication.
-- ============================================================
CREATE OR REPLACE FUNCTION rss_brain.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rss_sources_updated_at ON rss_brain.rss_sources;

CREATE TRIGGER trg_rss_sources_updated_at
BEFORE UPDATE ON rss_brain.rss_sources
FOR EACH ROW
EXECUTE FUNCTION rss_brain.update_updated_at();

COMMIT;
