/*
  Migration number: V001
  Description: Creates the rss_brain schema
  Run order: First, everything else depends on this
  Safe to re-run: Yes (uses IF NOT EXISTS)
*/

CREATE SCHEMA IF NOT EXISTS rss_brain;

SET search_path TO rss_brain;

-- The rss_brain schema isolates application objects from public/default schemas for cleaner separation and safer lifecycle management.
