/*
  Migration number: V005
  Description: Seeds initial RSS feed sources
  Depends on: V002
  Safe to re-run: Yes (uses INSERT ... ON CONFLICT DO NOTHING)
  The url column is UNIQUE so duplicates are safely skipped
*/

-- Use the application schema for object resolution in this migration.
SET search_path TO rss_brain;

BEGIN;

-- ON CONFLICT DO NOTHING makes this migration idempotent:
-- running it multiple times will not create duplicate rows because url is UNIQUE.
INSERT INTO rss_brain.rss_sources (name, url, category, fetch_frequency_minutes)
VALUES
  ('TechCrunch', 'https://techcrunch.com/feed/', 'tech', 60),
  ('Hacker News', 'https://hnrss.org/frontpage', 'tech', 30),
  ('Reuters Top News', 'https://feeds.reuters.com/reuters/topNews', 'world', 60),
  ('MIT Tech Review', 'https://www.technologyreview.com/feed/', 'tech', 120),
  ('The Verge', 'https://www.theverge.com/rss/index.xml', 'tech', 60)
ON CONFLICT (url) DO NOTHING;

COMMIT;
