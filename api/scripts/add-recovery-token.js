require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS recovery_token_hash TEXT
    `);
    await client.query('COMMIT');
    console.log('Migration complete: recovery_token_hash column added');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    pool.end();
  }
}

migrate().catch(e => { console.error(e.message); process.exit(1); });
