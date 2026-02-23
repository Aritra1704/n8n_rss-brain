require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

// Absolute path to the migrations directory so the script works from any cwd.
const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations');

// Tracks migration execution history in PUBLIC so it exists independently of app schemas.
const CREATE_MIGRATIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS public.schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(10) NOT NULL UNIQUE,
    filename VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT NOW(),
    execution_time_ms INTEGER,
    checksum TEXT
  );
`;

/**
 * Build PostgreSQL connection options from environment variables.
 * Defaults keep local development simple, while DB_POSTGRESDB_SSL=true
 * enables Railway-compatible SSL behavior.
 */
function getDbConfig() {
  const host = process.env.DB_POSTGRESDB_HOST || 'localhost';
  const port = Number(process.env.DB_POSTGRESDB_PORT || 5432);
  const database = process.env.DB_POSTGRESDB_DATABASE || 'postgres';
  const user = process.env.DB_POSTGRESDB_USER || 'postgres';
  const password = process.env.DB_POSTGRESDB_PASSWORD;
  const sslEnabled = String(process.env.DB_POSTGRESDB_SSL || '').toLowerCase() === 'true';

  return {
    host,
    port,
    database,
    user,
    password,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  };
}

/**
 * Create an MD5 checksum for migration file contents so we can detect
 * if an already-applied migration file has been modified later.
 */
function createChecksum(content) {
  return crypto.createHash('md5').update(content, 'utf8').digest('hex');
}

/**
 * Extract migration version token from file names like:
 * V001__create_schema.sql -> V001
 */
function extractVersion(filename) {
  const match = filename.match(/^(V\d+)__/i);
  if (!match) {
    throw new Error(`Invalid migration filename format: ${filename}`);
  }
  return match[1].toUpperCase();
}

/**
 * Read all SQL migration files and return them in deterministic run order.
 * Alphabetical order ensures V001, V002, V003... execution sequence.
 */
async function getMigrationFiles(migrationsDir) {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Execute pending migrations and record successful runs.
 * Returns summary stats for optional programmatic callers.
 */
async function runMigrations() {
  const config = getDbConfig();
  const client = new Client(config);
  let appliedCount = 0;
  let skippedCount = 0;
  let currentFilename = '';

  console.log(
    `🔌 Connecting to PostgreSQL at ${config.host}:${config.port}/${config.database}...`
  );

  try {
    await client.connect();

    console.log('📋 Checking migration history...');
    await client.query(CREATE_MIGRATIONS_TABLE_SQL);

    const migrationFiles = await getMigrationFiles(MIGRATIONS_DIR);

    for (const filename of migrationFiles) {
      currentFilename = filename;
      const version = extractVersion(filename);
      const filePath = path.join(MIGRATIONS_DIR, filename);
      const sql = await fs.readFile(filePath, 'utf8');
      const checksum = createChecksum(sql);

      const existing = await client.query(
        `
          SELECT version, filename, checksum
          FROM public.schema_migrations
          WHERE version = $1
          LIMIT 1
        `,
        [version]
      );

      if (existing.rowCount > 0) {
        const prior = existing.rows[0];

        // Detect migration file drift after it was already applied.
        if (prior.checksum && prior.checksum !== checksum) {
          throw new Error(
            `Checksum mismatch for ${filename}. ` +
              `Previously applied as ${prior.filename} with checksum ${prior.checksum}, ` +
              `current checksum is ${checksum}.`
          );
        }

        skippedCount += 1;
        console.log(`⏭  Skipping ${version} (already applied)`);
        continue;
      }

      console.log(`🚀 Running migration: ${filename}`);
      const startedAt = Date.now();

      await client.query(sql);

      const executionTimeMs = Date.now() - startedAt;
      await client.query(
        `
          INSERT INTO public.schema_migrations (version, filename, execution_time_ms, checksum)
          VALUES ($1, $2, $3, $4)
        `,
        [version, filename, executionTimeMs, checksum]
      );

      appliedCount += 1;
      console.log(`✅ Applied ${filename} (${executionTimeMs}ms)`);
    }

    console.log(`🎉 Migrations complete: ${appliedCount} applied, ${skippedCount} skipped`);
    return { applied: appliedCount, skipped: skippedCount };
  } catch (error) {
    if (currentFilename) {
      console.error(`💥 Migration failed: ${currentFilename}`);
    } else {
      console.error('💥 Migration failed: before processing migration files');
    }
    console.error(error);
    throw error;
  } finally {
    // Always close DB connection so local runs and CI jobs terminate cleanly.
    await client.end().catch(() => {});
  }
}

module.exports = { runMigrations };

// Support direct execution: `node database/migrate.js`
if (require.main === module) {
  runMigrations().catch(() => {
    process.exit(1);
  });
}
