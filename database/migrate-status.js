require('dotenv').config();
const { Client } = require('pg');

/**
 * Build DB config from environment variables with local-friendly defaults.
 * SSL mode supports hosted environments like Railway when DB_POSTGRESDB_SSL=true.
 */
function getDbConfig() {
  const sslEnabled = String(process.env.DB_POSTGRESDB_SSL || '').toLowerCase() === 'true';

  return {
    host: process.env.DB_POSTGRESDB_HOST || 'localhost',
    port: Number(process.env.DB_POSTGRESDB_PORT || 5432),
    database: process.env.DB_POSTGRESDB_DATABASE || 'postgres',
    user: process.env.DB_POSTGRESDB_USER || 'postgres',
    password: process.env.DB_POSTGRESDB_PASSWORD,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  };
}

/**
 * Print a table of applied migrations from public.schema_migrations.
 */
async function showMigrationStatus() {
  const config = getDbConfig();
  const client = new Client(config);

  console.log(
    `🔌 Connecting to PostgreSQL at ${config.host}:${config.port}/${config.database}...`
  );

  try {
    await client.connect();

    const tableCheck = await client.query(
      `SELECT to_regclass('public.schema_migrations') AS table_name`
    );

    if (!tableCheck.rows[0].table_name) {
      console.log('No migrations applied yet (public.schema_migrations table does not exist).');
      return;
    }

    const result = await client.query(`
      SELECT version, filename, executed_at, execution_time_ms, checksum
      FROM public.schema_migrations
      ORDER BY version ASC
    `);

    if (result.rowCount === 0) {
      console.log('No migrations applied yet.');
      return;
    }

    console.table(result.rows);
  } catch (error) {
    console.error('💥 Failed to fetch migration status');
    console.error(error);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

if (require.main === module) {
  showMigrationStatus();
}

module.exports = { showMigrationStatus };
