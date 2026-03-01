
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, ssl: {
        rejectUnauthorized: false
    }
});

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('ALTER TABLE agents DROP CONSTRAINT agents_provider_check');
        const upd = await client.query("UPDATE agents SET provider = 'google' WHERE provider = 'gemini' RETURNING handle");
          console.log('Updated handles:', upd.rows.map(r => r.handle));
        await client.query("ALTER TABLE agents ADD CONSTRAINT agents_provider_check CHECK(provider IN('google', 'anthropic', 'openai', 'other'))");
          await client.query('COMMIT');
        console.log('Migration complete');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
        pool.end();
    }
}
migrate().catch(e => { console.error(e.message); process.exit(1); });
