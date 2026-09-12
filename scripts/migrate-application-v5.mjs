// Explicit, narrowly scoped additive migration. No API startup or unrelated migrations.
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const apply = process.argv.includes('--apply');
const envFile = process.env.TDT_MIGRATION_ENV_FILE;
const dbPackage = process.env.TDT_MIGRATION_DB_PACKAGE;
if (!envFile || !dbPackage) throw new Error('Set TDT_MIGRATION_ENV_FILE and TDT_MIGRATION_DB_PACKAGE explicitly.');
const env = parseEnv(readFileSync(envFile, 'utf8'));
const expectedRef = 'eyqlgdlovvipidpdraqb';
const databaseUrl = new URL(env.DATABASE_URL);
if (new URL(env.SUPABASE_URL).hostname !== expectedRef + '.supabase.co' ||
    !(databaseUrl.hostname === 'db.' + expectedRef + '.supabase.co' || decodeURIComponent(databaseUrl.username) === 'postgres.' + expectedRef)) {
  throw new Error('Database target does not match the public application project.');
}
const { Pool } = createRequire(dbPackage)('pg');
const pool = new Pool({ connectionString: databaseUrl.toString(), connectionTimeoutMillis: 10000, max: 1 });
const fields = ['film_readiness', 'film_access', 'decision_support', 'guardian_consent', 'investment_readiness'];
try {
  if (apply) await pool.query(readFileSync(fileURLToPath(new URL('../migrations/2026-09-11-application-v5.sql', import.meta.url)), 'utf8'));
  const { rows } = await pool.query(
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='applications' AND column_name=ANY($1::text[])",
    [fields],
  );
  const ready = rows.length === fields.length && rows.every(row => row.data_type === 'text' && row.is_nullable === 'YES');
  console.log(JSON.stringify({ applied: apply, ready, verifiedColumns: rows.length }));
  if (!ready) process.exitCode = 1;
} finally {
  await pool.end();
}
